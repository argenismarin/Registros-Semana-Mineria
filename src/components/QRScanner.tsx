'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import jsQR from 'jsqr'

interface QRScannerProps {
  onScan: (data: string) => void
  onClose?: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef<boolean>(false)
  const animationRef = useRef<number | null>(null)
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(() => {
    // Limpiar timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current)
      initTimeoutRef.current = null
    }

    // Detener stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    // Cancelar animación
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    scanningRef.current = false
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 Iniciando cámara...')
      setIsLoading(true)
      setError(null)
      
      // Limpiar recursos anteriores
      cleanup()
      
      // Verificar soporte
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no soportado')
      }

      // Configuraciones progresivas
      const constraints = [
        // Configuración básica para móviles
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        },
        // Configuración fallback
        {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 }
          },
          audio: false
        },
        // Último recurso
        {
          video: true,
          audio: false
        }
      ]

      let stream: MediaStream | null = null
      let lastError: Error | null = null

      for (const constraint of constraints) {
        try {
          console.log('🔄 Probando constraint:', constraint)
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          console.log('✅ Stream obtenido exitosamente')
          break
        } catch (err) {
          lastError = err as Error
          console.warn('❌ Fallo constraint:', err)
        }
      }

      if (!stream) {
        throw lastError || new Error('No se pudo obtener stream de video')
      }

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        const video = videoRef.current
        
        // Limpiar listeners anteriores
        video.onloadedmetadata = null
        video.oncanplay = null
        video.onerror = null

        // Configurar video
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.setAttribute('muted', 'true')
        video.setAttribute('autoplay', 'true')
        video.style.objectFit = 'cover'
        
        // Promesa para manejar la inicialización
        const initializeVideo = () => {
          return new Promise<void>((resolve, reject) => {
            let resolved = false

            const handleSuccess = () => {
              if (resolved) return
              resolved = true
              console.log('✅ Video inicializado correctamente')
              setIsLoading(false)
              setTimeout(() => startScanning(), 100)
              resolve()
            }

            const handleError = (error: any) => {
              if (resolved) return
              resolved = true
              console.error('❌ Error inicializando video:', error)
              reject(error)
            }

            // Event listeners
            video.onloadedmetadata = () => {
              console.log('📹 Metadata cargada')
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                handleSuccess()
              }
            }

            video.oncanplay = () => {
              console.log('▶️ Video listo para reproducir')
              handleSuccess()
            }

            video.onerror = (error) => {
              console.error('❌ Error en video:', error)
              handleError(error)
            }

            // Timeout de seguridad
            initTimeoutRef.current = setTimeout(() => {
              if (!resolved) {
                console.log('⏰ Timeout - forzando inicialización')
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  handleSuccess()
                } else {
                  handleError(new Error('Timeout inicializando video'))
                }
              }
            }, 5000)
          })
        }

        // Intentar reproducir
        try {
          const playPromise = video.play()
          if (playPromise) {
            await playPromise
            console.log('▶️ Video reproduciéndose')
          }
        } catch (playError) {
          console.warn('⚠️ Error en play inicial:', playError)
        }

        // Esperar inicialización
        await initializeVideo()
      }
    } catch (error) {
      console.error('❌ Error iniciando cámara:', error)
      setHasPermission(false)
      setIsLoading(false)
      
      let errorMessage = 'Error accediendo a la cámara'
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Permisos de cámara denegados'
            break
          case 'NotFoundError':
            errorMessage = 'No se encontró cámara'
            break
          case 'NotSupportedError':
            errorMessage = 'Cámara no soportada'
            break
          case 'NotReadableError':
            errorMessage = 'Cámara en uso por otra aplicación'
            break
          case 'OverconstrainedError':
            errorMessage = 'Configuración de cámara no soportada'
            break
        }
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [cleanup])

  const startScanning = useCallback(() => {
    if (scanningRef.current || !videoRef.current || !canvasRef.current) {
      console.log('⚠️ No se puede iniciar escaneo - condiciones no cumplidas')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('❌ No se pudo obtener contexto 2D')
      return
    }

    // Verificar que el video esté listo
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('⏳ Video no listo, reintentando en 100ms...')
      setTimeout(() => startScanning(), 100)
      return
    }

    scanningRef.current = true
    setIsScanning(true)
    console.log('🔍 Iniciando escaneo de QR')

    const scanFrame = () => {
      if (!scanningRef.current || !video.videoWidth || !video.videoHeight) {
        if (scanningRef.current) {
          animationRef.current = requestAnimationFrame(scanFrame)
        }
        return
      }

      try {
        // Ajustar canvas
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Dibujar frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Obtener datos de imagen
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        
        // Detectar QR
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        })
        
        if (qrCode) {
          console.log('🎯 QR detectado:', qrCode.data)
          scanningRef.current = false
          setIsScanning(false)
          cleanup()
          onScan(qrCode.data)
          return
        }
      } catch (error) {
        console.warn('⚠️ Error en frame de escaneo:', error)
      }

      // Continuar escaneando
      if (scanningRef.current) {
        animationRef.current = requestAnimationFrame(scanFrame)
      }
    }

    // Iniciar escaneo
    animationRef.current = requestAnimationFrame(scanFrame)
  }, [onScan, cleanup])

  // Inicializar cámara al montar
  useEffect(() => {
    startCamera()
  }, [startCamera])

  const handleManualInput = () => {
    const qrData = prompt('Ingresa el código QR manualmente:')
    if (qrData?.trim()) {
      cleanup()
      onScan(qrData.trim())
    }
  }

  const handleRestart = () => {
    console.log('🔄 Reiniciando cámara...')
    cleanup()
    setHasPermission(null)
    setError(null)
    setIsLoading(true)
    setTimeout(() => startCamera(), 100)
  }

  const handleClose = () => {
    console.log('❌ Cerrando escáner...')
    cleanup()
    if (onClose) {
      onClose()
    }
  }

  // Estados de carga
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Iniciando cámara...</h3>
          <p className="text-gray-600 text-sm mb-4">Por favor permite el acceso cuando se solicite</p>
          <div className="text-xs text-gray-500 mb-4">
            Si toma demasiado tiempo, prueba el botón Reintentar
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRestart}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={handleClose}
              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error de permisos
  if (hasPermission === false || error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">📷</div>
            <h3 className="text-lg font-semibold mb-2">Problema con la cámara</h3>
            <p className="text-gray-600 mb-4 text-sm">
              {error || 'No se pudo acceder a la cámara'}
            </p>
            
            <div className="text-left text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded">
              <strong>Soluciones:</strong><br/>
              • Permite el acceso a la cámara<br/>
              • Cierra otras apps que usen la cámara<br/>
              • Recarga la página<br/>
              • Prueba con otro navegador
            </div>
            
            <div className="space-y-2">
              <button
                onClick={handleRestart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                🔄 Reintentar cámara
              </button>
              <button
                onClick={handleManualInput}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                ✍️ Entrada manual
              </button>
              <button
                onClick={handleClose}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                ❌ Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Interfaz de escaneo
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black bg-opacity-70 p-4 flex justify-between items-center text-white">
        <div>
          <h2 className="text-lg font-semibold">📱 Escanear QR</h2>
          <p className="text-sm opacity-80">Apunta hacia el código QR</p>
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
        >
          ❌
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ backgroundColor: '#000' }}
        />
        
        {/* Canvas oculto */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Marco de escaneo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Marco principal */}
            <div className="w-64 h-64 border-2 border-white border-opacity-50 rounded-lg"></div>
            
            {/* Esquinas destacadas */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br-lg"></div>
            
            {/* Línea de escaneo animada */}
            {isScanning && (
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="w-full h-0.5 bg-green-400 animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Indicador de estado */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {isScanning ? '🔍 Escaneando...' : '⏸️ Pausado'}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-black bg-opacity-70 p-4">
        <div className="flex justify-center space-x-3">
          <button
            onClick={handleManualInput}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
          >
            ✍️ Manual
          </button>
          <button
            onClick={handleRestart}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
          >
            🔄 Reiniciar
          </button>
          <button
            onClick={handleClose}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
          >
            ❌ Cerrar
          </button>
        </div>
      </div>
    </div>
  )
} 