'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

export default function ConfiguracionPage() {
  const [configuracion, setConfiguracion] = useState({
    spreasheetId: '',
    serviceEmail: '',
    isConfigured: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verificarConfiguracion()
  }, [])

  const verificarConfiguracion = async () => {
    try {
      const response = await fetch('/api/configuracion/google-sheets')
      const data = await response.json()
      setConfiguracion(data)
    } catch (error) {
      toast.error('Error verificando configuración')
    } finally {
      setLoading(false)
    }
  }

  const testearConexion = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracion/test-sheets', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Conexión con Google Sheets exitosa')
      } else {
        toast.error('Error conectando con Google Sheets: ' + result.error)
      }
    } catch (error) {
      toast.error('Error probando conexión')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-event-blue text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
          <p className="text-blue-100">Configurar Google Sheets y otras integraciones</p>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Estado de Google Sheets */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Google Sheets</h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${configuracion.isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${configuracion.isConfigured ? 'text-green-700' : 'text-red-700'}`}>
                  {configuracion.isConfigured ? 'Configurado' : 'No configurado'}
                </span>
              </div>
            </div>

            {configuracion.isConfigured ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">✅ Configuración activa</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Spreadsheet ID:</strong> {configuracion.spreasheetId}</p>
                    <p><strong>Service Account:</strong> {configuracion.serviceEmail}</p>
                  </div>
                </div>
                
                <button
                  onClick={testearConexion}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  {loading ? 'Probando...' : '🔗 Probar conexión'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">❌ Google Sheets no configurado</h3>
                  <p className="text-sm text-red-700">
                    Para habilitar la sincronización con Google Sheets, necesitas configurar las variables de entorno.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-3">📋 Pasos para configurar:</h3>
                  <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                    <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" className="underline">Google Cloud Console</a></li>
                    <li>Crea un nuevo proyecto o selecciona uno existente</li>
                    <li>Habilita la <strong>Google Sheets API</strong></li>
                    <li>Crea credenciales de <strong>cuenta de servicio</strong></li>
                    <li>Descarga el archivo JSON de credenciales</li>
                    <li>Crea una hoja de Google Sheets</li>
                    <li>Comparte la hoja con el email de la cuenta de servicio</li>
                    <li>Configura las variables de entorno:</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Variables de entorno (.env.local):</h4>
                  <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto">
{`GOOGLE_SHEETS_SPREADSHEET_ID=tu_spreadsheet_id_aqui
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-cuenta@proyecto.iam.gserviceaccount.com  
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\ntu_clave_aqui\\n-----END PRIVATE KEY-----"`}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Configuración de HTTPS */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">HTTPS para Cámara en Móviles</h2>
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">📱 Permisos de cámara en móviles</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Los navegadores móviles requieren HTTPS para acceder a la cámara. 
                  Para desarrollo local, puedes usar:
                </p>
                <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                  npm run dev:https
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">🌐 Para producción:</h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Despliega en un servidor con HTTPS (Vercel, Netlify, etc.)</li>
                  <li>Usa ngrok para túnel HTTPS local: <code className="bg-blue-100 px-1 rounded">ngrok http 3000</code></li>
                  <li>Configura un certificado SSL en tu servidor</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Información del sistema */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Estado del Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">💾 Base de datos</h3>
                <p className="text-sm text-gray-600">En memoria (se reinicia con el servidor)</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">🔄 Sincronización</h3>
                <p className="text-sm text-gray-600">
                  {configuracion.isConfigured ? 'Google Sheets activo' : 'Solo local'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">📱 Scanner QR</h3>
                <p className="text-sm text-gray-600">Disponible con cámara</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">🖨️ Impresión</h3>
                <p className="text-sm text-gray-600">Escarapelas y códigos QR</p>
              </div>
            </div>
          </div>

          {/* Volver */}
          <div className="text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-event-blue hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              ← Volver al registro
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 