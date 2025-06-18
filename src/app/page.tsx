'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import RegistroForm from '@/components/RegistroForm'
import ListaAsistentes from '@/components/ListaAsistentes'
import EscarapelaPreview from '@/components/EscarapelaPreview'
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
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false)
  const [mostrarQRScanner, setMostrarQRScanner] = useState(false)

  useEffect(() => {
    // En entorno Vercel (serverless), no usar tiempo real
    console.log('🌐 Modo serverless - Sin tiempo real')
    toast.info('🌐 Aplicación cargada (modo serverless)', {
      position: 'bottom-right',
      autoClose: 2000,
    })

    cargarAsistentes()
  }, [])

  // Función para notificar eventos (simplificada para Vercel)
  const notificarEvento = (evento: string, data: any) => {
    // En modo serverless, solo hacer log del evento
    console.log(`📡 Evento: ${evento}`, data)
  }

  const cargarAsistentes = async () => {
    setLoading(true)
    try {
      console.log('🔄 Cargando asistentes...')
      const response = await fetch('/api/asistentes')
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Datos recibidos:', data)
      
      // Manejar respuestas con estructura de diagnóstico
      if (data.asistentes) {
        setAsistentes(data.asistentes)
        console.log(`✅ ${data.asistentes.length} asistentes cargados`)
        if (data.warning) {
          toast.warning(data.warning, { autoClose: 5000 })
        }
        if (data.error) {
          console.error('Error de Google Sheets:', data.error)
          toast.error(`Problema con Google Sheets: ${data.error}`, { autoClose: 5000 })
        }
      } else {
        // Respuesta directa (array de asistentes)
        setAsistentes(data)
        console.log(`✅ ${data.length} asistentes cargados directamente`)
      }
      
    } catch (error) {
      console.error('❌ Error cargando asistentes:', error)
      toast.error(`Error cargando asistentes: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // En caso de error, intentar cargar desde diagnóstico
      try {
        console.log('🔧 Intentando diagnóstico como fallback...')
        const diagResponse = await fetch('/api/diagnostico')
        const diagData = await diagResponse.json()
        
        if (diagData.googleSheets?.totalAsistentes > 0) {
          toast.info(`Se detectaron ${diagData.googleSheets.totalAsistentes} asistentes en Google Sheets. Intenta recargar la página.`)
        }
      } catch (diagError) {
        console.error('❌ Error en diagnóstico:', diagError)
      }
    } finally {
      setLoading(false)
    }
  }

  const marcarAsistencia = async (id: string) => {
    try {
      const response = await fetch(`/api/asistentes/${id}/asistencia`, {
        method: 'POST',
      })
      const asistente = await response.json()
      
      // Notificar a otros clientes
      notificarEvento('asistencia-marcada', { 
        asistente, 
        device: 'Manual' 
      })
      
    } catch (error) {
      toast.error('Error marcando asistencia')
    }
  }

  const imprimirEscarapela = async (asistente: Asistente) => {
    try {
      // Marcar como impresa en la base de datos
      await fetch(`/api/asistentes/${asistente.id}/imprimir`, {
        method: 'POST',
      })

      // Notificar a otros clientes
      notificarEvento('escarapela-impresa', { ...asistente, escarapelaImpresa: true })

      // Abrir ventana de impresión
      const ventanaImpresion = window.open('', '_blank')
      if (ventanaImpresion) {
        ventanaImpresion.document.write(`
          <html>
            <head>
              <title>Escarapela - ${asistente.nombre}</title>
              <link rel="stylesheet" href="/globals.css">
              <style>
                body { margin: 0; padding: 20px; }
                .escarapela {
                  width: 85mm;
                  height: 54mm;
                  border: 2px solid #000;
                  border-radius: 8px;
                  padding: 10px;
                  background: white;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  font-family: Arial, sans-serif;
                }
                .escarapela h2 {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  text-align: center;
                }
                .escarapela .nombre {
                  font-size: 24px;
                  font-weight: bold;
                  text-align: center;
                  margin: 10px 0;
                }
                .escarapela .cargo {
                  font-size: 14px;
                  text-align: center;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="escarapela">
                <h2>EVENTO</h2>
                <div class="nombre">${asistente.nombre}</div>
                <div class="cargo">${asistente.cargo || ''}</div>
                <div class="cargo">${asistente.empresa || ''}</div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `)
        ventanaImpresion.document.close()
      }

      toast.success('Escarapela enviada a impresión')
    } catch (error) {
      toast.error('Error imprimiendo escarapela')
    }
  }

  const handleQRScan = async (qrData: string) => {
    try {
      setMostrarQRScanner(false)
      
      // Procesar el código QR escaneado
      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData }),
      })

      const result = await response.json()

      if (result.success) {
        // Notificar a otros clientes
        notificarEvento('qr-escaneado', { 
          asistente: result.asistente,
          device: 'Móvil/QR'
        })
        
        if (result.yaPresente) {
          toast.info(result.message)
        } else {
          toast.success(result.message)
        }
      } else {
        toast.error(result.error || 'Error procesando código QR')
      }
    } catch (error) {
      toast.error('Error escaneando código QR')
    }
  }

  const generarQRAsistente = async (asistente: Asistente) => {
    try {
      const response = await fetch(`/api/qr/generate/${asistente.id}`)
      
      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Error generando código QR')
      }

      // Crear elemento para descargar la imagen desde dataUrl
      const dataUrl = data.qrCode.dataUrl
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `qr-${asistente.nombre.replace(/\s+/g, '-').toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Marcar como QR generado
      try {
        await fetch('/api/qr/marcar-generados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asistentesIds: [asistente.id] })
        })
      } catch (error) {
        console.warn('Error marcando QR como generado:', error)
      }
      
      toast.success(`Código QR generado para ${asistente.nombre}`)
    } catch (error) {
      console.error('Error generando QR:', error)
      toast.error('Error generando código QR')
    }
  }

  const agregarAsistente = async (nuevoAsistente: Omit<Asistente, 'id' | 'presente' | 'escarapelaImpresa' | 'fechaRegistro' | 'fechaImpresion' | 'qrGenerado' | 'fechaGeneracionQR'>) => {
    try {
      console.log('➕ Agregando asistente:', nuevoAsistente)
      
      const response = await fetch('/api/asistentes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoAsistente),
      })
      
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }
      
      const asistente = await response.json()
      console.log('✅ Asistente creado:', asistente)
      
      // Actualizar lista inmediatamente
      setAsistentes(prev => [...prev, asistente])
      
      // Notificar a otros clientes
      notificarEvento('nuevo-asistente', asistente)
      
      toast.success(`${asistente.nombre} registrado exitosamente`)
      
    } catch (error) {
      console.error('❌ Error registrando asistente:', error)
      toast.error(`Error registrando asistente: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      
      // Recargar lista como fallback
      console.log('🔄 Recargando lista como fallback...')
      cargarAsistentes()
    }
  }

  const editarAsistente = async (asistenteActualizado: Asistente) => {
    try {
      const response = await fetch(`/api/asistentes/${asistenteActualizado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asistenteActualizado),
      })
      
      if (response.ok) {
        const resultado = await response.json()
        
        // Actualizar estado local
        setAsistentes(prev => 
          prev.map(a => a.id === asistenteActualizado.id ? resultado.asistente : a)
        )
        
        // Notificar a otros clientes
        notificarEvento('asistente-actualizado', resultado.asistente)
        
        toast.success('Asistente actualizado correctamente')
      } else {
        throw new Error('Error en la respuesta del servidor')
      }
    } catch (error) {
      toast.error('Error actualizando asistente')
      throw error
    }
  }

  const eliminarAsistente = async (id: string) => {
    try {
      const response = await fetch(`/api/asistentes/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        const resultado = await response.json()
        
        // Actualizar estado local
        setAsistentes(prev => prev.filter(a => a.id !== id))
        
        // Notificar a otros clientes
        notificarEvento('asistente-eliminado', { id })
        
        toast.success(resultado.mensaje)
      } else {
        throw new Error('Error en la respuesta del servidor')
      }
    } catch (error) {
      toast.error('Error eliminando asistente')
      throw error
    }
  }

  // Filtrar asistentes
  const asistentesFiltrados = asistentes.filter(asistente => {
    const coincideFiltro = filtro === '' || 
      asistente.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      asistente.email?.toLowerCase().includes(filtro.toLowerCase()) ||
      asistente.cargo?.toLowerCase().includes(filtro.toLowerCase()) ||
      asistente.empresa?.toLowerCase().includes(filtro.toLowerCase())
    
    const cumpleFiltroEstado = !mostrarSoloPendientes || !asistente.presente
    
    return coincideFiltro && cumpleFiltroEstado
  })

  // Estadísticas
  const totalAsistentes = asistentes.length
  const totalPresentes = asistentes.filter(a => a.presente).length
  const totalPendientes = totalAsistentes - totalPresentes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con estadísticas en tiempo real */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📋 Sistema de Registro de Eventos
            </h1>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Total: {totalAsistentes}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Presentes: {totalPresentes}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Pendientes: {totalPendientes}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Modo Serverless</span>
              </div>

            </div>
            
            <div className="flex gap-2 mt-4 sm:mt-0">
              <Link
                href="/importar"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition text-sm"
              >
                📁 Importar
              </Link>
              <Link
                href="/qr-masivo"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition text-sm"
              >
                📱 QR Masivo
              </Link>
              <Link
                href="/reportes"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
              >
                📊 Reportes
              </Link>
              <Link
                href="/evento"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition text-sm"
              >
                🎉 Evento
              </Link>
              <Link
                href="/configuracion"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition text-sm"
              >
                ⚙️ Configuración
              </Link>
              <Link
                href="/test-qr-scanner"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition text-sm"
              >
                🧪 Test QR
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario de registro */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                👤 Registro de Asistentes
              </h2>
              <RegistroForm onAgregarAsistente={agregarAsistente} />
            </div>

            {/* Controles */}
            <div className="mt-6 space-y-4">
              <button
                onClick={() => setMostrarQRScanner(!mostrarQRScanner)}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                📱 {mostrarQRScanner ? 'Cerrar' : 'Escanear QR'}
              </button>

              <button
                onClick={cargarAsistentes}
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? '🔄 Actualizando...' : '🔄 Actualizar Lista'}
              </button>
            </div>
          </div>

          {/* Lista de asistentes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  👥 Lista de Asistentes ({asistentesFiltrados.length})
                </h2>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar asistente..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mostrarSoloPendientes}
                      onChange={(e) => setMostrarSoloPendientes(e.target.checked)}
                      className="rounded"
                    />
                    Solo pendientes
                  </label>
                </div>
              </div>

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

        {/* Scanner QR */}
        {mostrarQRScanner && (
          <QRScanner 
            onScan={handleQRScan} 
            onClose={() => setMostrarQRScanner(false)}
          />
        )}
      </div>
    </div>
  )
} 