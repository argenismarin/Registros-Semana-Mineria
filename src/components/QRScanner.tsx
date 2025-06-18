'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import jsQR from 'jsqr'

interface QRScannerProps {
  onScan: (data: string) => void
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setIsScanning(true)
      
      // Verificar si getUserMedia está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia no soportado en este navegador')
      }

      // Solicitar permisos de cámara con configuración más compatible
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Cámara trasera preferida pero no obligatoria
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Asegurar autoplay en móviles
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('muted', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        
        const playPromise = videoRef.current.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Video reproducido exitosamente
              startScanning()
            })
            .catch((error) => {
              console.error('Error reproduciendo video:', error)
              // Intentar de nuevo después de un breve delay
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play().then(() => startScanning())
                }
              }, 100)
            })
        } else {
          // Para navegadores más antiguos
          videoRef.current.onloadedmetadata = () => {
            startScanning()
          }
        }
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error)
      setHasPermission(false)
      
      // Mensajes de error más específicos
      let errorMessage = 'No se pudo acceder a la cámara.'
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permisos de cámara denegados. Por favor permite el acceso en la configuración del navegador.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No se encontró ninguna cámara en este dispositivo.'
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Cámara no soportada en este navegador.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Cámara en uso por otra aplicación.'
        }
      }
      
      toast.error(errorMessage)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    const scanFrame = () => {
      if (!isScanning || !video.videoWidth || !video.videoHeight) {
        requestAnimationFrame(scanFrame)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      
      // Intentar detectar QR usando una implementación simple
      try {
        const qrData = detectQRFromImageData(imageData)
        if (qrData) {
          setIsScanning(false)
          onScan(qrData)
          return
        }
      } catch (error) {
        // Continuar escaneando si hay error
      }

      if (isScanning) {
        requestAnimationFrame(scanFrame)
      }
    }

    scanFrame()
  }

  // Función para detectar QR usando jsQR
  const detectQRFromImageData = (imageData: ImageData): string | null => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      return code ? code.data : null
    } catch (error) {
      console.error('Error detectando QR:', error)
      return null
    }
  }

  const handleManualInput = () => {
    const qrData = prompt('Ingresa el código QR manualmente:')
    if (qrData) {
      onScan(qrData)
    }
  }

  if (hasPermission === null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Solicitando permisos de cámara...</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">📷</div>
            <h3 className="text-lg font-semibold mb-2">Cámara no disponible</h3>
            <p className="text-gray-600 mb-4">
              No se pudo acceder a la cámara. Asegúrate de:
            </p>
            <div className="text-left text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded">
              • Permitir el acceso a la cámara cuando se solicite<br/>
              • Verificar que no esté en uso por otra app<br/>
              • En Chrome: ir a Configuración → Privacidad → Permisos del sitio<br/>
              • Recargar la página después de cambiar permisos
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setHasPermission(null)
                  startCamera()
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md"
              >
                🔄 Reintentar permisos
              </button>
              <button
                onClick={handleManualInput}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                ✍️ Ingresar código manualmente
              </button>

            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="relative z-10 bg-black bg-opacity-50 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">Escanear código QR</h2>

        </div>
        <p className="text-white text-sm mt-1">
          Apunta la cámara hacia el código QR de la entrada
        </p>
      </div>

      {/* Video feed */}
      <div className="relative flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* Canvas oculto para procesamiento */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Marco de escaneo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-64 h-64 border-2 border-white border-dashed rounded-lg"></div>
            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br"></div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="relative z-10 bg-black bg-opacity-50 p-4">
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleManualInput}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Entrada manual
          </button>
          <button
            onClick={() => {
              stopCamera()
              startCamera()
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Reiniciar cámara
          </button>
        </div>
      </div>
    </div>
  )
} 