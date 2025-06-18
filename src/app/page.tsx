'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-toastify'
import RegistroForm from '@/components/RegistroForm'
import ListaAsistentes from '@/components/ListaAsistentes'
import EscarapelaPreview from '@/components/EscarapelaPreview'
import QRScanner from '@/components/QRScanner'

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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [asistentes, setAsistentes] = useState<Asistente[]>([])
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false)
  const [mostrarQRScanner, setMostrarQRScanner] = useState(false)
  const [clientesConectados, setClientesConectados] = useState(0)

  useEffect(() => {
    // Inicializar Socket.io con configuración mejorada
    const initSocket = async () => {
      try {
        // Inicializar servidor Socket.io
        await fetch('/api/socket.io', { method: 'GET' })
        
        // Conectar cliente
        const newSocket = io({
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        newSocket.on('connect', () => {
          console.log('✅ Conectado al servidor en tiempo real')
          toast.success('Conectado - Actualizaciones en tiempo real activas', {
            position: 'bottom-right',
            autoClose: 2000,
          })
        })

        newSocket.on('disconnect', () => {
          console.log('❌ Desconectado del servidor')
          toast.warn('Conexión perdida - Intentando reconectar...', {
            position: 'bottom-right',
            autoClose: 3000,
          })
        })

        newSocket.on('reconnect', () => {
          console.log('🔄 Reconectado al servidor')
          toast.success('Reconectado - Actualizaciones en tiempo real activas', {
            position: 'bottom-right',
            autoClose: 2000,
          })
          cargarAsistentes() // Recargar datos tras reconexión
        })

        // Actualizaciones en tiempo real de asistentes
        newSocket.on('asistente-actualizado', (asistente: Asistente) => {
          console.log('📝 Asistente actualizado:', asistente.nombre)
          setAsistentes(prev => {
            const index = prev.findIndex(a => a.id === asistente.id)
            if (index >= 0) {
              const updated = [...prev]
              updated[index] = asistente
              return updated
            }
            return prev
          })
          toast.info(`📝 ${asistente.nombre} actualizado`, {
            position: 'bottom-right',
            autoClose: 3000,
          })
        })

        newSocket.on('nuevo-asistente', (asistente: Asistente) => {
          console.log('👤 Nuevo asistente:', asistente.nombre)
          setAsistentes(prev => {
            // Evitar duplicados
            if (prev.find(a => a.id === asistente.id)) {
              return prev
            }
            return [...prev, asistente]
          })
          toast.success(`👤 ¡Nuevo registro! ${asistente.nombre}`, {
            position: 'bottom-right',
            autoClose: 4000,
          })
        })

        newSocket.on('asistencia-marcada', (data: { asistente: Asistente, device: string }) => {
          console.log('✅ Asistencia marcada:', data.asistente.nombre)
          setAsistentes(prev => 
            prev.map(a => 
              a.id === data.asistente.id ? { ...a, presente: true, horaLlegada: data.asistente.horaLlegada } : a
            )
          )
          toast.success(`✅ ${data.asistente.nombre} marcado presente${data.device ? ` (${data.device})` : ''}`, {
            position: 'bottom-right',
            autoClose: 4000,
          })
        })

        newSocket.on('qr-escaneado', (data: { asistente: Asistente, device: string }) => {
          console.log('📱 QR escaneado:', data.asistente.nombre)
          setAsistentes(prev => 
            prev.map(a => 
              a.id === data.asistente.id ? { ...a, presente: true, horaLlegada: data.asistente.horaLlegada } : a
            )
          )
          toast.success(`📱 QR escaneado: ${data.asistente.nombre} presente`, {
            position: 'bottom-right',
            autoClose: 4000,
          })
        })

        newSocket.on('escarapela-impresa', (asistente: Asistente) => {
          console.log('🖨️ Escarapela impresa:', asistente.nombre)
          setAsistentes(prev => 
            prev.map(a => 
              a.id === asistente.id ? { ...a, escarapelaImpresa: true } : a
            )
          )
          toast.info(`🖨️ Escarapela impresa: ${asistente.nombre}`, {
            position: 'bottom-right',
            autoClose: 3000,
          })
        })

        // Contador de clientes conectados
        newSocket.on('clientes-conectados', (count: number) => {
          setClientesConectados(count)
        })

        // Importación masiva
        newSocket.on('importacion-masiva', (data: { cantidad: number, asistentes: any[] }) => {
          console.log('📁 Importación masiva:', data.cantidad, 'asistentes')
          
          // Agregar todos los asistentes importados
          setAsistentes(prev => [...prev, ...data.asistentes])
          
          toast.success(`📁 ¡Importación masiva! ${data.cantidad} asistentes agregados`, {
            position: 'bottom-right',
            autoClose: 5000,
          })
        })

        // QR Masivo generado
        newSocket.on('qr-masivo-generado', (data: { cantidad: number, mensaje: string }) => {
          console.log('📱 QR masivo generado:', data.cantidad, 'códigos QR')
          
          toast.success(`📱 ${data.mensaje}`, {
            position: 'bottom-right',
            autoClose: 5000,
          })
          
          // Recargar asistentes para actualizar estado QR generado
          cargarAsistentes()
        })

        // Asistente actualizado
        newSocket.on('asistente-actualizado', (asistenteActualizado: Asistente) => {
          console.log('✏️ Asistente actualizado:', asistenteActualizado.nombre)
          
          setAsistentes(prev => 
            prev.map(a => a.id === asistenteActualizado.id ? asistenteActualizado : a)
          )
          
          toast.info(`✏️ ${asistenteActualizado.nombre} actualizado`, {
            position: 'bottom-right',
            autoClose: 3000,
          })
        })

        // Asistente eliminado
        newSocket.on('asistente-eliminado', (data: { id: string, nombre: string }) => {
          console.log('🗑️ Asistente eliminado:', data.nombre)
          
          setAsistentes(prev => prev.filter(a => a.id !== data.id))
          
          toast.warning(`🗑️ ${data.nombre} eliminado`, {
            position: 'bottom-right',
            autoClose: 3000,
          })
        })

        setSocket(newSocket)
        
      } catch (error) {
        console.error('Error iniciando Socket.io:', error)
        toast.error('Error conectando tiempo real')
      }
    }

    initSocket()
    cargarAsistentes()

    return () => {
      socket?.close()
    }
  }, [])

  // Función para notificar eventos a otros clientes
  const notificarEvento = (evento: string, data: any) => {
    if (socket?.connected) {
      socket.emit(evento, data)
    }
  }

  const cargarAsistentes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/asistentes')
      const data = await response.json()
      setAsistentes(data)
    } catch (error) {
      toast.error('Error cargando asistentes')
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
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Crear ventana de descarga
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${asistente.nombre.replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Código QR generado para ${asistente.nombre}`)
    } catch (error) {
      toast.error('Error generando código QR')
    }
  }

  const agregarAsistente = async (nuevoAsistente: Omit<Asistente, 'id' | 'presente' | 'escarapelaImpresa' | 'fechaRegistro' | 'fechaImpresion' | 'qrGenerado' | 'fechaGeneracionQR'>) => {
    try {
      const response = await fetch('/api/asistentes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevoAsistente),
      })
      const asistente = await response.json()
      
      // Notificar a otros clientes
      notificarEvento('nuevo-asistente', asistente)
      
      toast.success(`${asistente.nombre} registrado exitosamente`)
    } catch (error) {
      toast.error('Error registrando asistente')
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
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Tiempo Real {socket?.connected ? '✓' : '✗'}</span>
              </div>
              {clientesConectados > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>{clientesConectados} conectados</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4 sm:mt-0">
              <a
                href="/importar"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition text-sm"
              >
                📁 Importar
              </a>
              <a
                href="/qr-masivo"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition text-sm"
              >
                📱 QR Masivo
              </a>
              <a
                href="/reportes"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
              >
                📊 Reportes
              </a>
              <a
                href="/evento"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition text-sm"
              >
                🎉 Evento
              </a>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">📱 Escanear Código QR</h3>
                <button
                  onClick={() => setMostrarQRScanner(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <QRScanner onScan={handleQRScan} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 