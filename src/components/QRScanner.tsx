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
  const [diagnostico, setDiagnostico] = useState<string[]>([])
  const [asistenteRegistrado, setAsistenteRegistrado] = useState<AsistenteRegistrado | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  const [ultimoQrEscaneado, setUltimoQrEscaneado] = useState('')
  
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const agregarDiagnostico = (mensaje: string) => {
    console.log(mensaje)
    setDiagnostico(prev => [...prev, `${new Date().toLocaleTimeString()}: ${mensaje}`])
  }

  const iniciarCamara = async () => {
    try {
      setEstado('loading')
      setErrorMessage('')
      setDiagnostico([])
      
      agregarDiagnostico('🎥 Iniciando proceso de cámara...')
      
      // Verificar soporte del navegador
      if (!navigator.mediaDevices) {
        throw new Error('Tu navegador no soporta navigator.mediaDevices')
      }
      
      agregarDiagnostico('✅ Navegador soporta acceso a cámara')
      
      // Verificar contexto seguro
      const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost'
      agregarDiagnostico(`🔒 Contexto seguro: ${isSecure ? 'Sí' : 'No'} (${location.protocol}//${location.hostname})`)
      
      // Enumerar dispositivos disponibles
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        agregarDiagnostico(`📹 Cámaras detectadas: ${videoDevices.length}`)
        videoDevices.forEach((device, index) => {
          agregarDiagnostico(`  - Cámara ${index + 1}: ${device.label || 'Sin nombre'} (${device.deviceId.slice(0, 8)}...)`)
        })
      } catch (enumError) {
        agregarDiagnostico(`⚠️ No se pudieron enumerar dispositivos: ${enumError}`)
      }
      
      // Configuración con preferencia de cámara trasera para móviles
      const config = { 
        video: { 
          facingMode: 'environment', // Intentar cámara trasera
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      }
      
      agregarDiagnostico(`📹 Probando configuración: ${JSON.stringify(config)}`)
      
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(config)
      } catch (error) {
        // Si falla, intentar con configuración básica
        agregarDiagnostico('⚠️ Cámara trasera no disponible, usando configuración básica')
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      
      if (stream && stream.getVideoTracks().length > 0) {
        const track = stream.getVideoTracks()[0]
        agregarDiagnostico(`✅ Cámara iniciada: ${track.label || 'Sin nombre'}`)
        
        streamRef.current = stream
        
        // Buscar elemento de video - usando un delay más largo
        agregarDiagnostico('📺 Esperando y buscando elemento video...')
        
        // Dar tiempo extra para que React renderice
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        let videoElement: HTMLVideoElement | null = null
        let intentos = 0
        const maxIntentos = 50 // 5 segundos
        
        while (!videoElement && intentos < maxIntentos) {
          // Buscar específicamente por ID primero
          videoElement = document.getElementById('camera-video') as HTMLVideoElement
          
          if (!videoElement) {
            // Buscar cualquier video element
            const videos = document.querySelectorAll('video')
            if (videos.length > 0) {
              videoElement = videos[0] as HTMLVideoElement
              agregarDiagnostico(`🔍 Encontrado video alternativo: ${videos.length} elementos video en el DOM`)
            }
          }
          
          if (videoElement) {
            agregarDiagnostico(`✅ Elemento video encontrado: ID=${videoElement.id || 'sin-id'}, clases=${videoElement.className}`)
            break
          }
          
          await new Promise(resolve => setTimeout(resolve, 100))
          intentos++
          
          if (intentos % 10 === 0) {
            agregarDiagnostico(`🔍 Buscando... (${intentos}/${maxIntentos})`)
            // Debug: mostrar qué hay en el DOM
            const allVideos = document.querySelectorAll('video')
            agregarDiagnostico(`🔍 Videos en DOM: ${allVideos.length}`)
          }
        }
        
        if (!videoElement) {
          // Debug final
          const allElements = document.querySelectorAll('*[id*="video"], *[class*="video"], video')
          agregarDiagnostico(`🔍 DEBUG: Elementos con 'video': ${allElements.length}`)
          allElements.forEach((el, i) => {
            agregarDiagnostico(`  ${i}: ${el.tagName} id="${el.id}" class="${el.className}"`)
          })
          throw new Error(`No se encontró elemento video después de ${maxIntentos * 100}ms`)
        }
        
        // Configurar video
        agregarDiagnostico('📺 Configurando stream en el video...')
        videoElement.srcObject = stream
        videoElement.playsInline = true
        videoElement.muted = true
        videoElement.autoplay = true
        
        // Esperar a que cargue y reproduzca
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout: Video no respondió en 10 segundos'))
          }, 10000)
          
          const onSuccess = () => {
            clearTimeout(timeout)
            agregarDiagnostico(`📐 Video configurado: ${videoElement!.videoWidth}x${videoElement!.videoHeight}`)
            agregarDiagnostico('▶️ ¡Video funcionando!')
            setEstado('ready')
            resolve()
          }
          
          const onError = (e: any) => {
            clearTimeout(timeout)
            agregarDiagnostico(`❌ Error en video: ${e}`)
            reject(e)
          }
          
          if (videoElement!.readyState >= 2) {
            // Ya está listo
            onSuccess()
          } else {
            videoElement!.addEventListener('loadeddata', onSuccess, { once: true })
            videoElement!.addEventListener('canplay', onSuccess, { once: true })
          }
          
          videoElement!.addEventListener('error', onError, { once: true })
          
          // Forzar play
          videoElement!.play().catch(playError => {
            agregarDiagnostico(`⚠️ Error en play: ${playError.message}`)
            // No necesariamente fatal
          })
        })
        
      } else {
        throw new Error('Stream sin tracks de video')
      }
      
    } catch (error: any) {
      agregarDiagnostico(`❌ Error final: ${error.name} - ${error.message}`)
      
      let mensaje = 'Error desconocido'
      
      if (error.name === 'NotAllowedError') {
        mensaje = 'Permiso de cámara denegado. Permite el acceso y recarga la página.'
      } else if (error.name === 'NotFoundError') {
        mensaje = 'No se encontró ninguna cámara en el dispositivo.'
      } else if (error.name === 'NotReadableError') {
        mensaje = 'La cámara está siendo usada por otra aplicación.'
      } else if (error.message.includes('elemento video') || error.message.includes('video en el DOM')) {
        mensaje = 'Error interno: No se pudo encontrar el elemento de video. Intenta recargar la página.'
      } else if (error.message.includes('Timeout')) {
        mensaje = 'La cámara tardó demasiado en responder. Intenta de nuevo.'
      } else {
        mensaje = `Error: ${error.message}`
      }
      
      setErrorMessage(mensaje)
      setEstado('error')
    }
  }

  const iniciarEscaneo = () => {
    if (estado !== 'ready') return
    
    setEscaneando(true)
    setEstado('scanning')
    agregarDiagnostico('📱 Iniciando escaneo de códigos QR...')
    
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement
    const canvas = canvasRef.current
    
    if (!videoElement || !canvas) {
      agregarDiagnostico('❌ No se encontró video o canvas para escaneo')
      return
    }
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      agregarDiagnostico('❌ No se pudo obtener contexto 2D del canvas')
      return
    }
    
    // Configurar canvas
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 480
    
    agregarDiagnostico(`📐 Canvas configurado: ${canvas.width}x${canvas.height}`)
    
    // Función de escaneo continuo
    const escanear = () => {
      if (!escaneando) return
      
      try {
        // Dibujar frame actual del video en el canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        
        // Obtener datos de imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // Intentar detectar código QR
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        })
        
        if (code) {
          const qrData = code.data
          
          // Evitar escaneos duplicados rápidos
          if (qrData !== ultimoQrEscaneado) {
            setUltimoQrEscaneado(qrData)
            agregarDiagnostico(`🎯 Código QR detectado: ${qrData}`)
            procesarQR(qrData)
          }
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
    agregarDiagnostico('⏹️ Escaneo detenido')
  }

  const procesarQR = async (qrData: string) => {
    try {
      agregarDiagnostico(`🔄 Procesando QR: ${qrData}`)
      
      // Pausar escaneo temporalmente para evitar duplicados
      detenerEscaneo()
      
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
        
        if (result.yaPresente) {
          agregarDiagnostico(`⚠️ ${asistente.nombre} ya estaba presente`)
        } else {
          agregarDiagnostico(`✅ ${asistente.nombre} registrado como presente`)
        }
        
        // Mostrar popup por 3 segundos, luego continuar escaneando
        setTimeout(() => {
          setAsistenteRegistrado(null)
          // Resetear último QR para permitir re-escaneo
          setTimeout(() => {
            setUltimoQrEscaneado('')
            iniciarEscaneo()
          }, 1000)
        }, 3000)
        
      } else {
        agregarDiagnostico(`❌ Error: ${result.error}`)
        alert(`Error: ${result.error}`)
        // Reanudar escaneo después de error
        setTimeout(() => {
          setUltimoQrEscaneado('')
          iniciarEscaneo()
        }, 2000)
      }
      
    } catch (error) {
      console.error('Error procesando QR:', error)
      agregarDiagnostico(`❌ Error de red: ${error}`)
      alert('Error de conexión al procesar QR')
      // Reanudar escaneo después de error
      setTimeout(() => {
        setUltimoQrEscaneado('')
        iniciarEscaneo()
      }, 2000)
    }
  }

  const detenerCamara = () => {
    // Detener escaneo
    setEscaneando(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (streamRef.current) {
      agregarDiagnostico('⏹️ Deteniendo cámara...')
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        agregarDiagnostico(`🛑 Track detenido: ${track.kind} - ${track.label}`)
      })
      streamRef.current = null
    }
    
    // Limpiar video element
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement
    if (videoElement) {
      videoElement.srcObject = null
    }
  }

  useEffect(() => {
    // Delay aún más largo para dar tiempo a React
    const timer = setTimeout(() => {
      iniciarCamara()
    }, 1500)
    
    return () => {
      clearTimeout(timer)
      detenerCamara()
    }
  }, [])

  const handleClose = () => {
    detenerCamara()
    onClose()
  }

  const copiarDiagnostico = () => {
    const texto = diagnostico.join('\n')
    navigator.clipboard.writeText(texto).then(() => {
      alert('Diagnóstico copiado al portapapeles')
    }).catch(() => {
      alert('No se pudo copiar automáticamente.')
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {escaneando ? '📱 Escaneando códigos QR...' : '📹 Escáner QR'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* UN SOLO elemento video que siempre está presente */}
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
            
            {/* Canvas oculto para procesamiento de QR */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
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
                {/* Marco de escaneo */}
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
              </div>
            </div>
          )}

          {estado === 'error' && (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4 font-semibold">{errorMessage}</p>
              <div className="space-y-2">
                <button
                  onClick={iniciarCamara}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={copiarDiagnostico}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Copiar diagnóstico
                </button>
              </div>
            </div>
          )}

          {estado === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-semibold">¡Cámara lista!</p>
              <button
                onClick={iniciarEscaneo}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                📱 Iniciar escaneo de QR
              </button>
            </div>
          )}

          {estado === 'scanning' && (
            <div className="text-center space-y-4">
              <p className="text-blue-600 font-semibold">
                Apunta la cámara hacia un código QR...
              </p>
              <button
                onClick={detenerEscaneo}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                ⏹️ Detener escaneo
              </button>
            </div>
          )}

          {/* Log de diagnóstico */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-gray-700">📋 Log de Diagnóstico:</h4>
              <button
                onClick={copiarDiagnostico}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Copiar
              </button>
            </div>
            <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
              {diagnostico.length === 0 ? (
                <p className="text-gray-400">Iniciando diagnóstico...</p>
              ) : (
                diagnostico.map((linea, index) => (
                  <div key={index} className="font-mono">{linea}</div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cerrar
            </button>
            <button
              onClick={iniciarCamara}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}