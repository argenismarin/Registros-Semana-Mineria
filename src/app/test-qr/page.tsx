'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'

export default function TestQRPage() {
  const [qrData, setQrData] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [loading, setLoading] = useState(false)

  const generarQRPrueba = async () => {
    setLoading(true)
    try {
      // Crear datos de prueba
      const testData = {
        id: `test-${Date.now()}`,
        nombre: 'Asistente Prueba',
        evento: 'registro-eventos',
        timestamp: new Date().toISOString()
      }

      // Simular llamada a la API
      const response = await fetch('/api/qr/generate/test-123')
      
      if (!response.ok) {
        throw new Error('Error en la API')
      }

      const data = await response.json()
      
      if (data.success) {
        setQrData(JSON.stringify(testData, null, 2))
        setQrImage(data.qrCode.dataUrl)
        toast.success('¡QR generado exitosamente!')
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error generando QR de prueba')
    } finally {
      setLoading(false)
    }
  }

  const descargarQR = () => {
    if (!qrImage) return
    
    const a = document.createElement('a')
    a.href = qrImage
    a.download = 'qr-prueba.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    toast.success('QR descargado')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🧪 Prueba del Generador de QR
            </h1>
            <p className="text-gray-600">
              Verifica que la generación de códigos QR funcione correctamente
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Panel de control */}
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-blue-900 mb-4">
                  📋 Controles de Prueba
                </h2>
                
                <div className="space-y-4">
                  <button
                    onClick={generarQRPrueba}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
                  >
                    {loading ? '🔄 Generando...' : '🎯 Generar QR de Prueba'}
                  </button>
                  
                  {qrImage && (
                    <button
                      onClick={descargarQR}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
                    >
                      💾 Descargar QR
                    </button>
                  )}
                  
                  <a
                    href="/"
                    className="block w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition text-center"
                  >
                    🏠 Volver al Inicio
                  </a>
                </div>
              </div>

              {/* Datos del QR */}
              {qrData && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📄 Datos del QR
                  </h3>
                  <pre className="text-sm text-gray-700 bg-white p-4 rounded border overflow-x-auto">
                    {qrData}
                  </pre>
                </div>
              )}
            </div>

            {/* Panel de resultados */}
            <div className="space-y-6">
              {qrImage ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <h2 className="text-xl font-semibold text-green-900 mb-4">
                    ✅ QR Generado Exitosamente
                  </h2>
                  
                  <div className="bg-white p-4 rounded-lg border border-green-300 inline-block">
                    <img 
                      src={qrImage} 
                      alt="Código QR generado" 
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                  
                  <p className="text-green-700 mt-4 text-sm">
                    El código QR se generó correctamente. 
                    Puedes descargarlo o escanearlo con tu teléfono.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Esperando Generación
                  </h2>
                  <p className="text-gray-600">
                    Haz clic en "Generar QR de Prueba" para ver el resultado
                  </p>
                </div>
              )}

              {/* Status de APIs */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                  🔧 Estado de APIs
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>API QR Individual: /api/qr/generate/[id]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>API QR Masivo: /api/qr/masivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>API QR Scanner: /api/qr/scan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enlaces útiles */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              🔗 Enlaces Útiles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href="/qr-masivo"
                className="block p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition text-center"
              >
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium text-indigo-900">QR Masivo</div>
                <div className="text-sm text-indigo-700">Generar múltiples QR</div>
              </a>
              
              <a
                href="/importar"
                className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition text-center"
              >
                <div className="text-2xl mb-2">📁</div>
                <div className="font-medium text-green-900">Importar</div>
                <div className="text-sm text-green-700">Cargar asistentes</div>
              </a>
              
              <a
                href="/reportes"
                className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-center"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium text-blue-900">Reportes</div>
                <div className="text-sm text-blue-700">Ver estadísticas</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 