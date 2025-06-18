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

  // Función para limpiar recursos
  const cleanup = useCallback(() => {
    console.log('🧹 Limpiando recursos...')
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    scanningRef.current = false
    setIsScanning(false)
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Función para iniciar cámara
  const startCamera = useCallback(async () => {
    console.log('🎥 === INICIANDO CÁMARA ===')
    
    try {
      cleanup()
      setIsLoading(true)
      setError(null)

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no soportado')
      }

      console.log('📱 Solicitando permisos de cámara...')
      
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('✅ Stream obtenido')

      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        const video = videoRef.current
        console.log('📺 Configurando video...')

        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        video.autoplay = true

        // Función que progresa directamente
        const forceProgress = () => {
          console.log('🚀 Forzando progreso a interfaz de escaneo...')
          setIsLoading(false)
          setTimeout(() => {
            startScanning()
          }, 200)
        }

        // Intentar play y progresar inmediatamente
        try {
          await video.play()
          console.log('🎵 Video reproduciéndose')
          
          // Progresar inmediatamente después de play exitoso
          setTimeout(forceProgress, 500)
          
        } catch (playError) {
          console.warn('⚠️ Error en play:', playError)
          // Progresar aunque haya error de play
          setTimeout(forceProgress, 800)
        }

        // Backup: progreso garantizado en 1 segundo
        setTimeout(() => {
          if (isLoading) {
            console.log('⏰ Backup timeout - forzando progreso')
            forceProgress()
          }
        }, 1000)
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
        }
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [cleanup, isLoading])

  // Función para iniciar escaneo
  const startScanning = useCallback(() => {
    console.log('🔍 === INICIANDO ESCANEO ===')
    
    if (scanningRef.current) {
      console.log('⚠️ Ya está escaneando')
      return
    }

    if (!videoRef.current || !canvasRef.current) {
      console.log('❌ Referencias no disponibles, reintentando...')
      setTimeout(() => startScanning(), 500)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('❌ No se pudo obtener contexto 2D')
      return
    }

    scanningRef.current = true
    setIsScanning(true)
    console.log('✅ Escaneo iniciado')

    const scanFrame = () => {
      if (!scanningRef.current) return

      try {
        // Solo procesar si el video tiene dimensiones
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height)
          
          if (qrCode) {
            console.log('🎯 QR detectado:', qrCode.data)
            scanningRef.current = false
            setIsScanning(false)
            cleanup()
            onScan(qrCode.data)
            return
          }
        }
        // Si no hay dimensiones, continuar intentando
      } catch (error) {
        console.warn('⚠️ Error en frame:', error)
      }

      if (scanningRef.current) {
        animationRef.current = requestAnimationFrame(scanFrame)
      }
    }

    scanFrame()
  }, [onScan, cleanup])

  // Inicializar
  useEffect(() => {
    console.log('🚀 Componente montado')
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
    console.log('🔄 REINICIANDO')
    cleanup()
    setTimeout(() => {
      setHasPermission(null)
      setError(null)
      setIsLoading(true)
      startCamera()
    }, 100)
  }

  const handleClose = () => {
    console.log('❌ CERRANDO')
    cleanup()
    if (onClose) {
      onClose()
    }
  }

  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Iniciando cámara...</h3>
          <p className="text-gray-600 text-sm mb-4">
            {hasPermission === null ? 'Solicitando permisos...' : 'Configurando video...'}
          </p>
          
          <div className="text-xs text-gray-500 mb-4">
            Progresa automáticamente en 1 segundo
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

  // Pantalla de error
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
            
            <div className="space-y-2">
              <button
                onClick={handleRestart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                🔄 Reintentar
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
          <h2 className="text-lg font-semibold">📱 Escáner QR</h2>
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
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Marco de escaneo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-64 h-64 border-2 border-white border-opacity-50 rounded-lg"></div>
            
            {/* Esquinas */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br-lg"></div>
            
            {/* Línea de escaneo */}
            {isScanning && (
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="w-full h-0.5 bg-green-400 animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Estado */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {isScanning ? '🔍 Escaneando...' : '⏸️ Preparando...'}
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