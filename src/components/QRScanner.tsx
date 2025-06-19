'use client'

import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'

interface QRScannerProps {
  onClose: () => void
}

interface AsistenteRegistrado {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  horaLlegada?: string
  presente: boolean
  yaPresente?: boolean
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const [estado, setEstado] = useState<'loading' | 'ready' | 'error' | 'scanning'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [asistenteRegistrado, setAsistenteRegistrado] = useState<AsistenteRegistrado | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  const [ultimoQrEscaneado, setUltimoQrEscaneado] = useState('')
  const [tiempoRestante, setTiempoRestante] = useState(0)
  
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const iniciarCamara = async () => {
    try {
      setEstado('loading')
      setErrorMessage('')
      setMensajeError(null)
      
      if (!navigator.mediaDevices) {
        throw new Error('Tu navegador no soporta acceso a cámara')
      }
      
      // Configuración con preferencia de cámara trasera para móviles
      const config = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      }
      
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(config)
      } catch (error) {
        // Si falla, intentar con configuración básica
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      
      if (stream && stream.getVideoTracks().length > 0) {
        streamRef.current = stream
        
        // Dar tiempo para que React renderice
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        let videoElement: HTMLVideoElement | null = null
        let intentos = 0
        const maxIntentos = 50
        
        while (!videoElement && intentos < maxIntentos) {
          videoElement = document.getElementById('camera-video') as HTMLVideoElement
          
          if (!videoElement) {
            const videos = document.querySelectorAll('video')
            if (videos.length > 0) {
              videoElement = videos[0] as HTMLVideoElement
            }
          }
          
          if (videoElement) break
          
          await new Promise(resolve => setTimeout(resolve, 100))
          intentos++
        }
        
        if (!videoElement) {
          throw new Error('No se pudo encontrar el elemento de video')
        }
        
        // Configurar video
        videoElement.srcObject = stream
        videoElement.playsInline = true
        videoElement.muted = true
        videoElement.autoplay = true
        
        // Esperar a que cargue
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout: Video no respondió'))
          }, 10000)
          
          const onSuccess = () => {
            clearTimeout(timeout)
            setEstado('ready')
            resolve()
          }
          
          const onError = (e: any) => {
            clearTimeout(timeout)
            reject(e)
          }
          
          if (videoElement!.readyState >= 2) {
            onSuccess()
          } else {
            videoElement!.addEventListener('loadeddata', onSuccess, { once: true })
            videoElement!.addEventListener('canplay', onSuccess, { once: true })
          }
          
          videoElement!.addEventListener('error', onError, { once: true })
          
          videoElement!.play().catch(() => {
            // No fatal si falla el play
          })
        })
        
      } else {
        throw new Error('No se pudo obtener stream de video')
      }
      
    } catch (error: any) {
      let mensaje = 'Error desconocido'
      
      if (error.name === 'NotAllowedError') {
        mensaje = 'Permiso de cámara denegado. Permite el acceso y recarga la página.'
      } else if (error.name === 'NotFoundError') {
        mensaje = 'No se encontró ninguna cámara en el dispositivo.'
      } else if (error.name === 'NotReadableError') {
        mensaje = 'La cámara está siendo usada por otra aplicación.'
      } else {
        mensaje = error.message || 'Error iniciando cámara'
      }
      
      setErrorMessage(mensaje)
      setEstado('error')
    }
  }

  const iniciarEscaneo = () => {
    // Solo iniciar si estamos en estado ready y no hay popups activos
    if (estado !== 'ready' || asistenteRegistrado || mensajeError) return
    
    setEscaneando(true)
    setEstado('scanning')
    setMensajeError(null)
    
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement
    const canvas = canvasRef.current
    
    if (!videoElement || !canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Configurar canvas
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 480
    
    // Función de escaneo continuo
    const escanear = () => {
      // Verificar que todavía deberíamos estar escaneando
      if (!escaneando || asistenteRegistrado || mensajeError) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }
      
      try {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        })
        
        // Solo procesar si encontramos un QR diferente al último
        if (code && code.data && code.data !== ultimoQrEscaneado && code.data.trim() !== '') {
          setUltimoQrEscaneado(code.data)
          procesarQR(code.data)
        }
      } catch (error) {
        console.error('Error en escaneo:', error)
      }
    }
    
    // Iniciar loop de escaneo (30 FPS)
    intervalRef.current = setInterval(escanear, 33)
  }

  const detenerEscaneo = () => {
    setEscaneando(false)
    setEstado('ready')
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const iniciarCountdown = (segundos: number, callback: () => void) => {
    setTiempoRestante(segundos)
    
    // Limpiar cualquier countdown anterior
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    
    countdownRef.current = setInterval(() => {
      setTiempoRestante(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          countdownRef.current = null
          callback()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const procesarQR = async (qrData: string) => {
    try {
      // DETENER COMPLETAMENTE el escaneo para evitar loops
      setEscaneando(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // Limpiar cualquier countdown anterior
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      
      const response = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrData })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        const asistente = result.asistente
        setAsistenteRegistrado(asistente)
        setMensajeError(null)
        
        // Iniciar countdown de 5 segundos - NO reanudar escaneo hasta que termine
        iniciarCountdown(5, () => {
          setAsistenteRegistrado(null)
          setTiempoRestante(0)
          // Dar tiempo adicional antes de reanudar escaneo
          setTimeout(() => {
            setUltimoQrEscaneado('') // Limpiar para permitir re-escaneo del mismo QR si es necesario
            setEstado('ready') // Volver a ready primero
            setTimeout(() => {
              iniciarEscaneo() // Luego iniciar escaneo
            }, 500)
          }, 2000)
        })
        
      } else {
        // Manejo especial para errores de Google Sheets
        let mensajeAmigable = result.error || 'Error procesando código QR'
        
        if (result.error && result.error.includes('no encontrado')) {
          mensajeAmigable = 'Este código no se corresponde con ninguno de la base de datos, verifique manualmente'
        } else if (result.error && (result.error.includes('Quota exceeded') || result.error.includes('quota'))) {
          mensajeAmigable = 'Límite de consultas excedido. Intente nuevamente en unos minutos.'
        } else if (result.error && result.error.includes('sheets.googleapis.com')) {
          mensajeAmigable = 'Error temporal de sincronización. El registro se guardó localmente.'
        }
        
        setMensajeError(mensajeAmigable)
        
        // Iniciar countdown de 5 segundos para error - NO reanudar escaneo hasta que termine
        iniciarCountdown(5, () => {
          setMensajeError(null)
          setTiempoRestante(0)
          // Dar tiempo adicional antes de reanudar escaneo
          setTimeout(() => {
            setUltimoQrEscaneado('') // Limpiar para permitir re-escaneo
            setEstado('ready') // Volver a ready primero
            setTimeout(() => {
              iniciarEscaneo() // Luego iniciar escaneo
            }, 500)
          }, 2000)
        })
      }
      
    } catch (error) {
      console.error('Error procesando QR:', error)
      
      // Detener escaneo también en catch
      setEscaneando(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      setMensajeError('Error de conexión al procesar el código QR')
      
      // Iniciar countdown de 5 segundos para error de conexión
      iniciarCountdown(5, () => {
        setMensajeError(null)
        setTiempoRestante(0)
        // Dar tiempo adicional antes de reanudar escaneo
        setTimeout(() => {
          setUltimoQrEscaneado('') // Limpiar para permitir re-escaneo
          setEstado('ready') // Volver a ready primero
          setTimeout(() => {
            iniciarEscaneo() // Luego iniciar escaneo
          }, 500)
        }, 2000)
      })
    }
  }

  const detenerCamara = () => {
    setEscaneando(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Limpiar countdown también
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setTiempoRestante(0)
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement
    if (videoElement) {
      videoElement.srcObject = null
    }
  }

  useEffect(() => {
    // Ejecutar iniciarCamara inmediatamente al montar el componente
    iniciarCamara()
    
    return () => {
      detenerCamara()
    }
  }, [])

  // Efecto adicional para iniciar escaneo automáticamente cuando esté ready
  useEffect(() => {
    if (estado === 'ready') {
      // Iniciar escaneo automáticamente después de que la cámara esté lista
      const timer = setTimeout(() => {
        iniciarEscaneo()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [estado])

  const handleClose = () => {
    detenerCamara()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {estado === 'scanning' ? '📱 Escaneando códigos QR...' : '📹 Escáner QR'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Elemento video principal */}
          <div className="relative">
            <video
              id="camera-video"
              className={`w-full h-64 object-cover rounded-lg border-2 ${
                estado === 'ready' ? 'border-green-500' : 
                estado === 'scanning' ? 'border-blue-500' : 'border-blue-300'
              }`}
              playsInline
              muted
              autoPlay
            />
            
            {/* Canvas oculto para procesamiento */}
            <canvas ref={canvasRef} className="hidden" />
            
            {estado === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Iniciando cámara...</p>
                </div>
              </div>
            )}
            
            {estado === 'ready' && (
              <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-sm">
                ✅ Cámara lista
              </div>
            )}
            
            {estado === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-blue-500 border-dashed w-48 h-48 rounded-lg animate-pulse">
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                    📱 Escaneando...
                  </div>
                </div>
              </div>
            )}
            
            {estado === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-90 rounded-lg">
                <div className="text-center text-red-800">
                  <div className="text-4xl mb-2">❌</div>
                  <p className="font-semibold">Error de cámara</p>
                </div>
              </div>
            )}
          </div>

          {/* Popup de asistente registrado */}
          {asistenteRegistrado && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center animate-bounce">
                <div className="text-6xl mb-4">
                  {asistenteRegistrado.yaPresente ? '⚠️' : '✅'}
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {asistenteRegistrado.yaPresente ? 'Ya registrado' : '¡Registrado!'}
                </h3>
                <p className="text-lg font-semibold text-blue-600 mb-2">
                  {asistenteRegistrado.nombre}
                </p>
                {asistenteRegistrado.cargo && (
                  <p className="text-gray-600 mb-1">{asistenteRegistrado.cargo}</p>
                )}
                {asistenteRegistrado.empresa && (
                  <p className="text-gray-600 mb-2">{asistenteRegistrado.empresa}</p>
                )}
                <p className="text-sm text-gray-500">
                  {asistenteRegistrado.yaPresente ? 
                    `Ya estaba presente desde las ${asistenteRegistrado.horaLlegada}` :
                    `Hora de llegada: ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                  }
                </p>
                <div className="mt-4 text-lg font-bold text-blue-600">
                  Continuando en {tiempoRestante} segundo{tiempoRestante !== 1 ? 's' : ''}...
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error para QR no válido */}
          {mensajeError && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold mb-2 text-orange-600">
                  Código no válido
                </h3>
                <p className="text-gray-700 mb-4">
                  {mensajeError}
                </p>
                <div className="text-lg font-bold text-orange-600">
                  Continuando en {tiempoRestante} segundo{tiempoRestante !== 1 ? 's' : ''}...
                </div>
              </div>
            </div>
          )}

          {estado === 'error' && (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4 font-semibold">{errorMessage}</p>
              <button
                onClick={iniciarCamara}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                🔄 Reintentar
              </button>
            </div>
          )}

          {/* Botón principal de escaneo */}
          <div className="text-center space-y-4">
            {estado === 'ready' && (
              <p className="text-green-600 font-semibold">Cámara lista - Iniciando escaneo...</p>
            )}
            
            {estado === 'scanning' && (
              <p className="text-blue-600 font-semibold">
                Apunta la cámara hacia un código QR...
              </p>
            )}
            
            <button
              onClick={iniciarCamara}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
            >
              📱 Escanear
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}