'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface QRScannerProps {
  onScan: (qr: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        // Solicitar acceso a la cámara
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        video.play()

        video.onloadedmetadata = () => {
          setStatus('ready')
          startScanning()
        }

      } catch (err) {
        console.error('Error accessing camera:', err)
        setError('No se pudo acceder a la cámara')
        setStatus('error')
      }
    }

    const startScanning = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      if (!video || !canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      const scan = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          
          if (code) {
            onScan(code.data)
            return
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(scan)
      }

      scan()
    }

    startCamera()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [onScan])

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Iniciando cámara</h3>
          <p className="text-gray-600">Solicitando permisos...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-4">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold mb-2">Error de cámara</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-4 text-white z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">📱 Escáner QR</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Canvas oculto */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Marco de escaneo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 border-2 border-white border-opacity-50 rounded-lg relative">
          {/* Esquinas */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl-lg"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr-lg"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl-lg"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br-lg"></div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 text-white text-center">
        <p className="text-lg mb-2">Apunta hacia un código QR</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}