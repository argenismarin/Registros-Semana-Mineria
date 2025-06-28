'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import RegistroForm from '@/components/RegistroForm'
import ListaAsistentes from '@/components/ListaAsistentes'
import QRScanner from '@/components/QRScanner'

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
  const [formularioExpandido, setFormularioExpandido] = useState(false)

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

  const asistentesFiltrados = asistentes
    .filter(asistente => {
    const coincideFiltro = !filtro || 
      asistente.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (asistente.email && asistente.email.toLowerCase().includes(filtro.toLowerCase())) ||
      (asistente.cargo && asistente.cargo.toLowerCase().includes(filtro.toLowerCase())) ||
      (asistente.empresa && asistente.empresa.toLowerCase().includes(filtro.toLowerCase()))
    
    const coincidePendiente = !mostrarSoloPendientes || !asistente.presente
    
    return coincideFiltro && coincidePendiente
  })
    .sort((a, b) => {
      // Ordenar alfabéticamente por nombre (ignorando mayúsculas/minúsculas)
      return a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase(), 'es', {
        sensitivity: 'base',
        numeric: true
      })
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
    if (isUpdatingRef.current) {
      toast.warning('Operación en progreso, espera...')
      return
    }

    try {
      isUpdatingRef.current = true
      console.log('🖨️ Generando escarapela individual para:', asistente.nombre)

      // Generar PDF individual (98mm × 128mm)
      const response = await ejecutarConTimeout(
        () => fetch('/api/reportes/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asistentes: [asistente],
            opciones: {
              modoImpresion: 'individual'
            }
          })
        }),
        'Generar escarapela individual'
      )

      if (!response.ok) {
        throw new Error(`Error generando PDF: ${response.status}`)
      }

      // Descargar el PDF
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `escarapela-${asistente.nombre.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Marcar como impresa en el backend
      const marcarResponse = await fetch(`/api/asistentes/${asistente.id}/imprimir`, {
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
            prev.map(a => a.id === asistente.id ? resultado.asistente : a)
          )
        }
      }

      toast.success(`🖨️ Escarapela individual de ${asistente.nombre} generada (98mm×128mm)`)
      
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

      // Colapsar formulario automáticamente
      setFormularioExpandido(false)

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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                📋 Sistema de Registro
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                Gestión de asistentes y control de asistencia
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Link
                href="/escarapelas"
                className="inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                🏷️ Escarapelas
              </Link>
              <button
                onClick={() => setMostrarCamara(true)}
                className="inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto"
              >
                📱 Escanear QR
              </button>
            </div>
          </div>

          {/* Indicadores de estado - Optimizado para móviles */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
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
            
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
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
                <span className="hidden sm:inline">
                {estadoGoogleSheets === 'configurado' && 'Google Sheets'}
                {estadoGoogleSheets === 'sincronizando' && 'Sincronizando...'}
                {estadoGoogleSheets === 'no-configurado' && 'Sin Google Sheets'}
                {estadoGoogleSheets === 'error' && 'Error Sheets'}
              </span>
                <span className="sm:hidden">
                  {estadoGoogleSheets === 'configurado' && 'Sheets OK'}
                  {estadoGoogleSheets === 'sincronizando' && 'Sync...'}
                  {estadoGoogleSheets === 'no-configurado' && 'Sin Sheets'}
                  {estadoGoogleSheets === 'error' && 'Error'}
                </span>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-4 text-gray-500">
              <span>Cliente: {clienteId.slice(-6)}</span>
            {ultimaSincronizacion && (
                <span>
                Última sync: {new Date(ultimaSincronizacion).toLocaleTimeString()}
              </span>
            )}
            </div>
          </div>
        </div>

        {/* Estadísticas - Optimizadas para móviles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 lg:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl lg:text-3xl">👥</div>
                </div>
                <div className="ml-3 lg:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs lg:text-sm font-medium text-gray-500 truncate">Total</dt>
                    <dd className="text-lg lg:text-xl font-bold text-gray-900">{estadisticas.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 lg:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl lg:text-3xl">✅</div>
                </div>
                <div className="ml-3 lg:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs lg:text-sm font-medium text-gray-500 truncate">Presentes</dt>
                    <dd className="text-lg lg:text-xl font-bold text-green-600">{estadisticas.presentes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 lg:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl lg:text-3xl">⏳</div>
                </div>
                <div className="ml-3 lg:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs lg:text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                    <dd className="text-lg lg:text-xl font-bold text-orange-600">{estadisticas.pendientes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-4 lg:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl lg:text-3xl">🖨️</div>
                </div>
                <div className="ml-3 lg:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs lg:text-sm font-medium text-gray-500 truncate">Escarapelas</dt>
                    <dd className="text-lg lg:text-xl font-bold text-blue-600">{estadisticas.escarapelasImpresas}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          {/* Formulario de registro - Colapsable */}
            <div className="bg-white shadow-sm rounded-lg">
            <button
              onClick={() => setFormularioExpandido(!formularioExpandido)}
              className="w-full px-4 sm:px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-lg"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">➕ Registrar Asistente</h2>
                <div className={`transform transition-transform duration-200 ${formularioExpandido ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {!formularioExpandido && (
                <p className="mt-1 text-sm text-gray-500">Haz clic aquí para registrar un nuevo asistente</p>
              )}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              formularioExpandido ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <RegistroForm onAgregarAsistente={agregarAsistente} />
              </div>
            </div>
          </div>

          {/* Lista de asistentes */}
            <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-medium text-gray-900">👥 Lista de Asistentes</h2>
                  
                {/* Filtros optimizados para móviles */}
                <div className="space-y-3">
                    <input
                      type="text"
                    placeholder="🔍 Buscar asistentes..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  <label className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                      <input
                        type="checkbox"
                        checked={mostrarSoloPendientes}
                        onChange={(e) => setMostrarSoloPendientes(e.target.checked)}
                      className="mr-3 w-4 h-4 rounded"
                      />
                    Mostrar solo pendientes
                    </label>
                  </div>
                </div>
              </div>
              
            <div className="px-2 sm:px-6 py-4">
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

        {mostrarCamara && (
          <QRScanner 
            onClose={() => setMostrarCamara(false)}
          />
        )}


      </div>
    </div>
  )
} 