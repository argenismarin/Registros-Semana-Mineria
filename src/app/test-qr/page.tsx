'use client'

import { useState, useEffect } from 'react'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  presente: boolean
}

export default function TestQRPage() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([])
  const [loading, setLoading] = useState(true)
  const [qrGenerado, setQrGenerado] = useState<string | null>(null)

  useEffect(() => {
    cargarAsistentes()
  }, [])

  const cargarAsistentes = async () => {
    try {
      const response = await fetch('/api/asistentes')
      if (response.ok) {
        const data = await response.json()
        setAsistentes(data)
      }
    } catch (error) {
      console.error('Error cargando asistentes:', error)
    } finally {
      setLoading(false)
    }
  }

  const generarQRSimple = (asistenteId: string) => {
    // QR simple que contiene solo el ID del asistente
    const qrData = asistenteId
    setQrGenerado(qrData)
  }

  const generarQRCompleto = (asistente: Asistente) => {
    // QR con JSON completo (como haría un generador real)
    const qrData = JSON.stringify({
      id: asistente.id,
      nombre: asistente.nombre,
      email: asistente.email,
      timestamp: new Date().toISOString()
    })
    setQrGenerado(qrData)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🧪 Generador de QR de Prueba
          </h1>
          <p className="text-gray-600">
            Genera códigos QR para probar el escáner. Copia el texto generado y úsalo en un generador de QR online.
          </p>
        </div>

        {qrGenerado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              ✅ Código QR Generado
            </h3>
            <div className="bg-white border rounded p-4 mb-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap break-all">
                {qrGenerado}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(qrGenerado)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                📋 Copiar al portapapeles
              </button>
              <button
                onClick={() => setQrGenerado(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                ✖️ Cerrar
              </button>
            </div>
            <div className="mt-4 text-sm text-green-700">
              <p><strong>Instrucciones:</strong></p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Copia el texto de arriba</li>
                <li>Ve a un generador QR online (ej: qr-code-generator.com)</li>
                <li>Pega el texto y genera el QR</li>
                <li>Muestra el QR al escáner en la página principal</li>
              </ol>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">👥 Asistentes Disponibles</h2>
          
          {asistentes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay asistentes disponibles
            </p>
          ) : (
            <div className="space-y-4">
              {asistentes.map((asistente) => (
                <div key={asistente.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {asistente.nombre}
                        {asistente.presente && (
                          <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                            ✅ Presente
                          </span>
                        )}
                      </h3>
                      {asistente.cargo && (
                        <p className="text-gray-600">{asistente.cargo}</p>
                      )}
                      {asistente.empresa && (
                        <p className="text-gray-500 text-sm">{asistente.empresa}</p>
                      )}
                      {asistente.email && (
                        <p className="text-gray-500 text-sm">{asistente.email}</p>
                      )}
                      <p className="text-gray-400 text-xs mt-1">ID: {asistente.id}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => generarQRSimple(asistente.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        📱 QR Simple
                      </button>
                      <button
                        onClick={() => generarQRCompleto(asistente)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      >
                        📱 QR Completo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            💡 Consejos para Pruebas
          </h3>
          <ul className="space-y-2 text-blue-700">
            <li><strong>QR Simple:</strong> Solo contiene el ID del asistente (más fácil de generar)</li>
            <li><strong>QR Completo:</strong> Contiene JSON con toda la información (más realista)</li>
            <li><strong>Prueba 1:</strong> Genera un QR, escanéalo → debe marcar como presente</li>
            <li><strong>Prueba 2:</strong> Escanea el mismo QR → debe decir "ya presente"</li>
            <li><strong>Prueba 3:</strong> Escanea un QR inválido → debe mostrar error</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
} 