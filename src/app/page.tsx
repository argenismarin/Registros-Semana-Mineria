'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import RegistroForm from '@/components/RegistroForm'
import ListaAsistentes from '@/components/ListaAsistentes'
import QRScanner from '@/components/QRScanner'
import SelectorPosicionEscarapela from '@/components/SelectorPosicionEscarapela'
import Link from 'next/link'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  horaLlegada?: string
  presente: boolean
  escarapelaImpresa: boolean
  fechaRegistro: string
  fechaImpresion?: string
  qrGenerado?: boolean
  fechaGeneracionQR?: string
}

export default function Home() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarCamara, setMostrarCamara] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false)
  const [asistenteParaEscarapela, setAsistenteParaEscarapela] = useState<Asistente | null>(null)
  const [estadoGoogleSheets, setEstadoGoogleSheets] = useState<'configurado' | 'no-configurado' | 'sincronizando' | 'error'>('no-configurado')
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<string | null>(null)
  
  // Estados para tiempo real
  const [clienteId, setClienteId] = useState('')
  const [estadoSincronizacion, setEstadoSincronizacion] = useState<'sincronizado' | 'sincronizando' | 'error'>('sincronizado')
  const intervalRef = useRef<NodeJS.Timeout>()
  const isUpdatingRef = useRef(false)

  // Configuración
  const INTERVALO_POLLING = 30000 // 30 segundos para reducir carga
  const TIMEOUT_OPERACION = 10000 // 10 segundos

  // Generar clienteId solo en el cliente para evitar errores de hidratación
  useEffect(() => {
    setClienteId(`cliente-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  }, [])

  const asistentesFiltrados = asistentes.filter(asistente => {
    const coincideFiltro = !filtro || 
      asistente.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (asistente.email && asistente.email.toLowerCase().includes(filtro.toLowerCase())) ||
      (asistente.cargo && asistente.cargo.toLowerCase().includes(filtro.toLowerCase())) ||
      (asistente.empresa && asistente.empresa.toLowerCase().includes(filtro.toLowerCase()))
    
    const coincidePendiente = !mostrarSoloPendientes || !asistente.presente
    
    return coincideFiltro && coincidePendiente
  })

  // Función helper para operaciones con timeout
  const ejecutarConTimeout = async (
    operacion: () => Promise<Response>,
    mensajeError: string
  ): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: ${mensajeError}`))
      }, TIMEOUT_OPERACION)

      operacion()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout))
    })
  }

  // Cargar asistentes simplificado
  const cargarAsistentes = useCallback(async (forzarCarga = false) => {
    if (isUpdatingRef.current && !forzarCarga) {
      console.log('⏭️ Omitiendo carga, operación en progreso')
      return
    }

    // No hacer nada si no tenemos clienteId aún
    if (!clienteId) {
      console.log('⏭️ Esperando clienteId...')
      return
    }

    try {
      setEstadoSincronizacion('sincronizando')
      
      console.log('🔄 Cargando asistentes...')
      const response = await fetch('/api/asistentes', {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Cliente-ID': clienteId
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data: Asistente[] = await response.json()
      console.log(`✅ ${data.length} asistentes cargados`)
      
      setAsistentes(data)
      setEstadoSincronizacion('sincronizado')
      
    } catch (error) {
      console.error('❌ Error cargando asistentes:', error)
      setEstadoSincronizacion('error')
      
      if (loading) {
        toast.error('Error cargando datos. Reintentando...')
      }
    } finally {
      setLoading(false)
    }
  }, [clienteId, loading])

  // Verificar estado de Google Sheets
  const verificarEstadoGoogleSheets = useCallback(async () => {
    try {
      const response = await fetch('/api/sincronizacion')
      const data = await response.json()
      
      if (data.configured) {
        setEstadoGoogleSheets('configurado')
      } else {
        setEstadoGoogleSheets('no-configurado')
      }
    } catch (error) {
      console.error('Error verificando Google Sheets:', error)
      setEstadoGoogleSheets('error')
    }
  }, [])

  // Sincronizar manualmente con Google Sheets
  const sincronizarGoogleSheets = async () => {
    if (estadoGoogleSheets === 'sincronizando') return

    try {
      setEstadoGoogleSheets('sincronizando')
      
      const response = await fetch('/api/sincronizacion', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setEstadoGoogleSheets('configurado')
        setUltimaSincronizacion(data.timestamp)
        toast.success('📊 Sincronización con Google Sheets completada')
        
        // Recargar asistentes
        cargarAsistentes(true)
      } else {
        throw new Error(data.error || 'Error en sincronización')
      }
    } catch (error) {
      console.error('Error sincronizando:', error)
      setEstadoGoogleSheets('error')
      toast.error(`Error sincronizando: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // Configurar polling para tiempo real
  useEffect(() => {
    // Solo cargar asistentes si ya tenemos clienteId
    if (!clienteId) return
    
    // Carga inicial
    cargarAsistentes(true)
    
    // Verificar estado de Google Sheets
    verificarEstadoGoogleSheets()

    // Configurar polling
    intervalRef.current = setInterval(() => {
      cargarAsistentes()
    }, INTERVALO_POLLING)

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [clienteId, cargarAsistentes, verificarEstadoGoogleSheets]) // Agregar clienteId como dependencia

  const marcarAsistencia = async (id: string) => {
    if (isUpdatingRef.current) {
      toast.warning('Operación en progreso, espera...')
      return
    }

    try {
      isUpdatingRef.current = true
      console.log('✅ Marcando asistencia para:', id)
      
      const response = await ejecutarConTimeout(
        () => fetch(`/api/asistentes/${id}/asistencia`, {
          method: 'POST',
          headers: {
            'X-Cliente-ID': clienteId
          }
        }),
        'Marcar asistencia'
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const resultado = await response.json()
      
      if (resultado.success && resultado.asistente) {
        // Actualización optimista
        setAsistentes(prev => 
          prev.map(a => a.id === id ? resultado.asistente : a)
        )
        
        toast.success(`✅ ${resultado.asistente.nombre} marcado como presente`)
        
        // Programar recarga
        setTimeout(() => cargarAsistentes(), 500)
      } else {
        throw new Error(resultado.error || 'Respuesta inválida del servidor')
      }
      
    } catch (error) {
      console.error('❌ Error marcando asistencia:', error)
      toast.error(`Error marcando asistencia: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Recargar como fallback
      cargarAsistentes(true)
    } finally {
      isUpdatingRef.current = false
    }
  }

  const imprimirEscarapela = async (asistente: Asistente) => {
    // Abrir modal de selección de posición
    setAsistenteParaEscarapela(asistente)
  }

  const confirmarImpresionEscarapela = async (posicion: number) => {
    if (!asistenteParaEscarapela || isUpdatingRef.current) {
      return
    }

    try {
      isUpdatingRef.current = true
      console.log('🖨️ Generando PDF de escarapela para:', asistenteParaEscarapela.nombre, 'en posición:', posicion + 1)

      // Obtener configuración del evento
      let eventoNombre = 'EVENTO'
      try {
        const configResponse = await fetch('/api/evento/configuracion')
        if (configResponse.ok) {
          const config = await configResponse.json()
          eventoNombre = config.nombre || 'EVENTO'
        }
      } catch (error) {
        console.log('⚠️ No se pudo obtener configuración del evento, usando nombre por defecto')
      }

      // Generar PDF usando el sistema de escarapelas
      const response = await ejecutarConTimeout(
        () => fetch('/api/reportes/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asistentes: [asistenteParaEscarapela],
            opciones: {
              posicionesSeleccionadas: [posicion], // Posición seleccionada
              eventoNombre: eventoNombre,
              mostrarCargo: !!asistenteParaEscarapela.cargo,
              mostrarEmpresa: !!asistenteParaEscarapela.empresa
            }
          })
        }),
        'Generar PDF de escarapela'
      )

      if (!response.ok) {
        throw new Error(`Error generando PDF: ${response.status}`)
      }

      // Descargar el PDF
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `escarapela-${asistenteParaEscarapela.nombre.replace(/\s+/g, '-').toLowerCase()}-pos${posicion + 1}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Marcar como impresa en el backend
      const marcarResponse = await fetch(`/api/asistentes/${asistenteParaEscarapela.id}/imprimir`, {
        method: 'POST',
        headers: {
          'X-Cliente-ID': clienteId
        }
      })

      if (marcarResponse.ok) {
        const resultado = await marcarResponse.json()
        if (resultado.success && resultado.asistente) {
          // Actualización optimista
          setAsistentes(prev => 
            prev.map(a => a.id === asistenteParaEscarapela.id ? resultado.asistente : a)
          )
        }
      }

      toast.success(`🖨️ PDF de escarapela de ${asistenteParaEscarapela.nombre} generado en posición ${posicion + 1}`)
      
      // Cerrar modal
      setAsistenteParaEscarapela(null)
      
      // Programar recarga
      setTimeout(() => cargarAsistentes(), 500)
      
    } catch (error) {
      console.error('❌ Error generando escarapela:', error)
      toast.error(`Error generando escarapela: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Recargar como fallback
      cargarAsistentes(true)
    } finally {
      isUpdatingRef.current = false
    }
  }

  // Función QR removida - solo prueba de cámara

  const generarQRAsistente = async (asistente: Asistente) => {
    try {
      console.log('📱 Generando QR para:', asistente.nombre)
      
      const response = await fetch(`/api/qr/generate/${asistente.id}?format=image`)
      
      if (!response.ok) {
        throw new Error(`Error generando QR: ${response.status}`)
      }
      
      // Crear blob y descargar
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${asistente.nombre.replace(/\s+/g, '-').toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`📱 QR de ${asistente.nombre} descargado`)
      
    } catch (error) {
      console.error('❌ Error generando QR:', error)
      toast.error(`Error generando QR: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const agregarAsistente = async (nuevoAsistente: Omit<Asistente, 'id' | 'presente' | 'escarapelaImpresa' | 'fechaRegistro' | 'fechaImpresion' | 'qrGenerado' | 'fechaGeneracionQR'>) => {
    if (isUpdatingRef.current) {
      toast.warning('Operación en progreso, espera...')
      return
    }

    try {
      isUpdatingRef.current = true
      console.log('➕ Agregando asistente:', nuevoAsistente.nombre)

      const response = await ejecutarConTimeout(
        () => fetch('/api/asistentes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cliente-ID': clienteId
          },
          body: JSON.stringify(nuevoAsistente),
        }),
        'Agregar asistente'
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const asistenteCreado = await response.json()

      // Actualización optimista
      setAsistentes(prev => [...prev, asistenteCreado])

      toast.success(`✅ ${asistenteCreado.nombre} registrado exitosamente`)
      
      // Programar recarga
      setTimeout(() => cargarAsistentes(), 500)

    } catch (error) {
      console.error('❌ Error agregando asistente:', error)
      toast.error(`Error registrando asistente: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Recargar como fallback
      cargarAsistentes(true)
    } finally {
      isUpdatingRef.current = false
    }
  }

  const editarAsistente = async (asistenteActualizado: Asistente) => {
    try {
      console.log('✏️ Editando asistente:', asistenteActualizado.nombre)

      const response = await fetch(`/api/asistentes/${asistenteActualizado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Cliente-ID': clienteId
        },
        body: JSON.stringify(asistenteActualizado),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const resultado = await response.json()

      if (resultado.success && resultado.asistente) {
        // Actualización optimista
        setAsistentes(prev => 
          prev.map(a => a.id === asistenteActualizado.id ? resultado.asistente : a)
        )

        toast.success(`✅ ${resultado.asistente.nombre} actualizado exitosamente`)
        
        // Programar recarga
        setTimeout(() => cargarAsistentes(), 500)
      } else {
        throw new Error(resultado.error || 'Respuesta inválida del servidor')
      }

    } catch (error) {
      console.error('❌ Error editando asistente:', error)
      toast.error(`Error actualizando asistente: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Recargar como fallback
      cargarAsistentes(true)
    }
  }

  const eliminarAsistente = async (id: string) => {
    try {
      console.log('🗑️ Eliminando asistente:', id)

      const response = await fetch(`/api/asistentes/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Cliente-ID': clienteId
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Actualización optimista
      setAsistentes(prev => prev.filter(a => a.id !== id))

      toast.success('🗑️ Asistente eliminado exitosamente')
      
      // Programar recarga
      setTimeout(() => cargarAsistentes(), 500)

    } catch (error) {
      console.error('❌ Error eliminando asistente:', error)
      toast.error(`Error eliminando asistente: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Recargar como fallback
      cargarAsistentes(true)
    }
  }

  // Estadísticas
  const estadisticas = {
    total: asistentes.length,
    presentes: asistentes.filter(a => a.presente).length,
    escarapelasImpresas: asistentes.filter(a => a.escarapelaImpresa).length,
    pendientes: asistentes.filter(a => !a.presente).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📋 Sistema de Registro de Eventos
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Gestión de asistentes y control de asistencia
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Link
                href="/escarapelas"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🏷️ Escarapelas
              </Link>
              <Link
                href="/test-qr-scanner"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                🧪 Página de Pruebas
              </Link>
              {(estadoGoogleSheets === 'configurado' || estadoGoogleSheets === 'sincronizando') && (
                <button
                  onClick={sincronizarGoogleSheets}
                  disabled={estadoGoogleSheets === 'sincronizando'}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {estadoGoogleSheets === 'sincronizando' ? '🔄' : '📊'} Sincronizar
                </button>
              )}
              <button
                onClick={() => setMostrarCamara(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                📱 Escanear QR
              </button>
            </div>
          </div>

          {/* Indicador de estado */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              estadoSincronizacion === 'sincronizado' 
                ? 'bg-green-100 text-green-700' 
                : estadoSincronizacion === 'sincronizando'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {estadoSincronizacion === 'sincronizado' && '✅'}
              {estadoSincronizacion === 'sincronizando' && '🔄'}
              {estadoSincronizacion === 'error' && '❌'}
              <span className="capitalize">{estadoSincronizacion}</span>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              estadoGoogleSheets === 'configurado' 
                ? 'bg-purple-100 text-purple-700' 
                : estadoGoogleSheets === 'sincronizando'
                ? 'bg-blue-100 text-blue-700'
                : estadoGoogleSheets === 'no-configurado'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {estadoGoogleSheets === 'configurado' && '📊'}
              {estadoGoogleSheets === 'sincronizando' && '🔄'}
              {estadoGoogleSheets === 'no-configurado' && '📋'}
              {estadoGoogleSheets === 'error' && '❌'}
              <span>
                {estadoGoogleSheets === 'configurado' && 'Google Sheets'}
                {estadoGoogleSheets === 'sincronizando' && 'Sincronizando...'}
                {estadoGoogleSheets === 'no-configurado' && 'Sin Google Sheets'}
                {estadoGoogleSheets === 'error' && 'Error Sheets'}
              </span>
            </div>
            
            <span className="text-gray-500">Cliente: {clienteId.slice(-6)}</span>
            
            {ultimaSincronizacion && (
              <span className="text-gray-500">
                Última sync: {new Date(ultimaSincronizacion).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">👥</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg font-medium text-gray-900">{estadisticas.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Presentes</dt>
                    <dd className="text-lg font-medium text-gray-900">{estadisticas.presentes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⏳</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                    <dd className="text-lg font-medium text-gray-900">{estadisticas.pendientes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🖨️</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Escarapelas</dt>
                    <dd className="text-lg font-medium text-gray-900">{estadisticas.escarapelasImpresas}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario de registro */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">➕ Registrar Asistente</h2>
              </div>
              <div className="px-6 py-4">
                <RegistroForm onAgregarAsistente={agregarAsistente} />
              </div>
            </div>
          </div>

          {/* Lista de asistentes */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-medium text-gray-900">👥 Lista de Asistentes</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Buscar asistentes..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={mostrarSoloPendientes}
                        onChange={(e) => setMostrarSoloPendientes(e.target.checked)}
                        className="mr-2 rounded"
                      />
                      Solo pendientes
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <ListaAsistentes
                  asistentes={asistentesFiltrados}
                  onMarcarAsistencia={marcarAsistencia}
                  onImprimirEscarapela={imprimirEscarapela}
                  onGenerarQR={generarQRAsistente}
                  onEditarAsistente={editarAsistente}
                  onEliminarAsistente={eliminarAsistente}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>

        {mostrarCamara && (
          <QRScanner 
            onClose={() => setMostrarCamara(false)}
          />
        )}

        {asistenteParaEscarapela && (
          <SelectorPosicionEscarapela
            asistente={asistenteParaEscarapela}
            onConfirmar={confirmarImpresionEscarapela}
            onCancelar={() => setAsistenteParaEscarapela(null)}
          />
        )}
      </div>
    </div>
  )
} 