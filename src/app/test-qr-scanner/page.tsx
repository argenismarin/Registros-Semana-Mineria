'use client'

import { useState } from 'react'
import QRScanner from '@/components/QRScanner'

export default function TestQRScannerPage() {
  const [showScanner, setShowScanner] = useState(false)
  const [lastResult, setLastResult] = useState<string>('')

  const handleScan = (qr: string) => {
    setLastResult(qr)
    setShowScanner(false)
    alert(`QR detectado: ${qr}`)
  }

  const handleClose = () => {
    setShowScanner(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          🧪 Prueba QR Scanner
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="text-center">
            <button
              onClick={() => setShowScanner(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-lg"
            >
              📱 Abrir Escáner QR
            </button>
          </div>

          {lastResult && (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                ✅ Último resultado:
              </h3>
              <p className="text-green-700 break-all">{lastResult}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📋 Instrucciones:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Haz clic en "Abrir Escáner QR"</li>
              <li>Permite el acceso a la cámara cuando se solicite</li>
              <li>Apunta la cámara hacia un código QR</li>
              <li>El resultado aparecerá automáticamente</li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Para desarrolladores:</h3>
            <p className="text-sm text-blue-700">
              Esta es una implementación completamente nueva y simplificada del QR Scanner.
              Usa solo las funciones básicas necesarias sin complicaciones.
            </p>
          </div>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={handleClose}
        />
      )}
    </div>
  )
} 