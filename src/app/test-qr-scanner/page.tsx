'use client'

import { useState } from 'react'
import QRScanner from '@/components/QRScanner'

export default function TestCameraPage() {
  const [mostrarCamara, setMostrarCamara] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📷 Prueba de Cámara
          </h1>
          <p className="text-gray-600">
            Página simple para probar si la cámara funciona correctamente
          </p>
        </div>

        {/* Información del navegador */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📊 Información del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Navegador:</strong> {typeof window !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Cargando...'}
            </div>
            <div>
              <strong>Protocolo:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'Cargando...'}
            </div>
            <div>
              <strong>Host:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'Cargando...'}
            </div>
            <div>
              <strong>Soporte de Cámara:</strong> {typeof navigator !== 'undefined' && navigator.mediaDevices ? '✅ Disponible' : '❌ No disponible'}
            </div>
          </div>
        </div>

        {/* Botón para probar cámara */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🎥 Prueba de Cámara</h2>
          <p className="text-gray-600 mb-4">
            Haz clic en el botón para abrir la cámara y verificar que funcione correctamente.
          </p>
          
          <button
            onClick={() => setMostrarCamara(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            📷 Abrir Cámara
          </button>
        </div>

        {/* Instrucciones */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">📝 Instrucciones</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Haz clic en "Abrir Cámara"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Permite el acceso a la cámara cuando el navegador lo solicite</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Verifica que puedes ver la imagen de la cámara</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Si aparece un error, lee el mensaje y sigue las sugerencias</span>
            </div>
          </div>
        </div>

        {/* Solución de problemas */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">⚠️ Solución de Problemas</h2>
          <div className="space-y-2 text-sm text-yellow-700">
            <p><strong>Error de permisos:</strong> Asegúrate de permitir el acceso a la cámara</p>
            <p><strong>Cámara no encontrada:</strong> Verifica que tu dispositivo tenga cámara</p>
            <p><strong>Cámara en uso:</strong> Cierra otras aplicaciones que puedan estar usando la cámara</p>
            <p><strong>En móviles:</strong> Algunos navegadores requieren HTTPS para acceder a la cámara</p>
          </div>
        </div>

        {/* Navegación */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Volver a la página principal
          </a>
        </div>

        {/* Modal de cámara */}
        {mostrarCamara && (
          <QRScanner 
            onClose={() => setMostrarCamara(false)}
          />
        )}
      </div>
    </div>
  )
} 