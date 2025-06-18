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

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      stopCamera()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    scanningRef.current = false
    setIsScanning(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Detener cámara anterior si existe
      stopCamera()
      
      // Verificar soporte
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no soportado')
      }

      // Configuración progresiva para máxima compatibilidad
      const constraints = [
        // Intento 1: Configuración ideal
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        },
        // Intento 2: Configuración básica
        {
          video: {
            facingMode: 'environment',
            width: 320,
            height: 240
          },
          audio: false
        },
        // Intento 3: Solo video sin restricciones
        {
          video: true,
          audio: false
        }
      ]

      let stream: MediaStream | null = null
      let lastError: Error | null = null

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (err) {
          lastError = err as Error
          console.warn('Fallo constraint:', constraint, err)
        }
      }

      if (!stream) {
        throw lastError || new Error('No se pudo obtener stream de video')
      }

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        // Configurar video para móviles
        const video = videoRef.current
        video.srcObject = stream
        
        // Atributos críticos para móviles
        video.setAttribute('playsinline', 'true')
        video.setAttribute('muted', 'true')
        video.setAttribute('autoplay', 'true')
        video.style.objectFit = 'cover'
        
        // Manejar la carga del video
        const handleLoadedMetadata = () => {
          setIsLoading(false)
          startScanning()
        }

        const handleCanPlay = () => {
          setIsLoading(false)
          startScanning()
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('canplay', handleCanPlay)

        // Intentar reproducir
        try {
          await video.play()
        } catch (playError) {
          console.warn('Error en play:', playError)
          // Intentar de nuevo después de un delay
          setTimeout(async () => {
            try {
              await video.play()
            } catch (retryError) {
              console.error('Error en retry play:', retryError)
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error('Error iniciando cámara:', error)
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
  }, [stopCamera])

  const startScanning = useCallback(() => {
    if (scanningRef.current || !videoRef.current || !canvasRef.current) {
      return
    }

    scanningRef.current = true
    setIsScanning(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('No se pudo obtener contexto 2D')
      return
    }

    const scanFrame = () => {
      if (!scanningRef.current || !video.videoWidth || !video.videoHeight) {
        if (scanningRef.current) {
          animationRef.current = requestAnimationFrame(scanFrame)
        }
        return
      }

      try {
        // Ajustar canvas al tamaño del video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Dibujar frame actual
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Obtener datos de imagen
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        
        // Detectar QR
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        })
        
        if (qrCode) {
          console.log('QR detectado:', qrCode.data)
          scanningRef.current = false
          setIsScanning(false)
          stopCamera()
          onScan(qrCode.data)
          return
        }
      } catch (error) {
        console.warn('Error en frame de escaneo:', error)
      }

      // Continuar escaneando
      if (scanningRef.current) {
        animationRef.current = requestAnimationFrame(scanFrame)
      }
    }

    // Iniciar escaneo
    animationRef.current = requestAnimationFrame(scanFrame)
  }, [onScan, stopCamera])

  // Inicializar cámara al montar
  useEffect(() => {
    startCamera()
  }, [startCamera])

  const handleManualInput = () => {
    const qrData = prompt('Ingresa el código QR manualmente:')
    if (qrData?.trim()) {
      stopCamera()
      onScan(qrData.trim())
    }
  }

  const handleRestart = () => {
    stopCamera()
    setHasPermission(null)
    setError(null)
    startCamera()
  }

  const handleClose = () => {
    stopCamera()
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
          <p className="text-gray-600 text-sm">Por favor permite el acceso cuando se solicite</p>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
          >
            Cancelar
          </button>
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