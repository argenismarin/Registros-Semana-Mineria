'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

interface ConfiguracionEvento {
  nombre: string
  descripcion: string
  fecha: string
  horaInicio: string
  horaFin: string
  ubicacion: string
  organizador: string
  contacto: string
  logoUrl: string
  colorPrimario: string
  colorSecundario: string
  mostrarEscarapelas: boolean
  mostrarQR: boolean
  requerirEmail: boolean
  requerirCargo: boolean
  requerirEmpresa: boolean
  mensajeBienvenida: string
  redesSociales: {
    facebook: string
    twitter: string
    instagram: string
    linkedin: string
  }
}

export default function EventoPage() {
  const [config, setConfig] = useState<ConfiguracionEvento>({
    nombre: 'Semana de la Minería',
    descripcion: 'Evento académico sobre innovación en minería',
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    horaFin: '18:00',
    ubicacion: 'Universidad Nacional de Colombia',
    organizador: 'Facultad de Minas',
    contacto: 'eventos@unal.edu.co',
    logoUrl: '',
    colorPrimario: '#1e40af',
    colorSecundario: '#3b82f6',
    mostrarEscarapelas: true,
    mostrarQR: true,
    requerirEmail: false,
    requerirCargo: false,
    requerirEmpresa: false,
    mensajeBienvenida: '¡Bienvenido al evento! Por favor registra tu asistencia.',
    redesSociales: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    }
  })

  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/evento/configuracion')
      if (response.ok) {
        const data = await response.json()
        setConfig({ ...config, ...data })
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
    } finally {
      setLoading(false)
    }
  }

  const guardarConfiguracion = async () => {
    setGuardando(true)
    try {
      const response = await fetch('/api/evento/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast.success('Configuración guardada exitosamente')
      } else {
        toast.error('Error guardando configuración')
      }
    } catch (error) {
      toast.error('Error conectando con el servidor')
    } finally {
      setGuardando(false)
    }
  }

  const handleInputChange = (field: keyof ConfiguracionEvento, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleRedesSocialesChange = (red: keyof typeof config.redesSociales, value: string) => {
    setConfig(prev => ({
      ...prev,
      redesSociales: { ...prev.redesSociales, [red]: value }
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎉 Configuración del Evento</h1>
              <p className="text-gray-600">Personaliza la información y apariencia del evento</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={guardarConfiguracion}
                disabled={guardando}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {guardando ? 'Guardando...' : '💾 Guardar'}
              </button>
              <a
                href="/"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
              >
                🏠 Volver
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Información Básica */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Información Básica</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Evento *
                </label>
                <input
                  type="text"
                  value={config.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Semana de la Minería 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organizador
                </label>
                <input
                  type="text"
                  value={config.organizador}
                  onChange={(e) => handleInputChange('organizador', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Universidad Nacional"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={config.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe brevemente el evento..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={config.fecha}
                  onChange={(e) => handleInputChange('fecha', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={config.ubicacion}
                  onChange={(e) => handleInputChange('ubicacion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Auditorio Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Inicio
                </label>
                <input
                  type="time"
                  value={config.horaInicio}
                  onChange={(e) => handleInputChange('horaInicio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Fin
                </label>
                <input
                  type="time"
                  value={config.horaFin}
                  onChange={(e) => handleInputChange('horaFin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contacto
                </label>
                <input
                  type="email"
                  value={config.contacto}
                  onChange={(e) => handleInputChange('contacto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contacto@evento.com"
                />
              </div>
            </div>
          </div>

          {/* Personalización */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🎨 Personalización</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Primario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorPrimario}
                    onChange={(e) => handleInputChange('colorPrimario', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={config.colorPrimario}
                    onChange={(e) => handleInputChange('colorPrimario', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#1e40af"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Secundario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorSecundario}
                    onChange={(e) => handleInputChange('colorSecundario', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={config.colorSecundario}
                    onChange={(e) => handleInputChange('colorSecundario', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL del Logo
                </label>
                <input
                  type="url"
                  value={config.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje de Bienvenida
                </label>
                <textarea
                  value={config.mensajeBienvenida}
                  onChange={(e) => handleInputChange('mensajeBienvenida', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mensaje que verán los asistentes al registrarse..."
                />
              </div>
            </div>
          </div>

          {/* Funcionalidades */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">⚙️ Funcionalidades</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mostrarEscarapelas"
                  checked={config.mostrarEscarapelas}
                  onChange={(e) => handleInputChange('mostrarEscarapelas', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="mostrarEscarapelas" className="text-sm font-medium">
                  🖨️ Habilitar impresión de escarapelas
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mostrarQR"
                  checked={config.mostrarQR}
                  onChange={(e) => handleInputChange('mostrarQR', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="mostrarQR" className="text-sm font-medium">
                  📱 Habilitar códigos QR y escaneo
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requerirEmail"
                  checked={config.requerirEmail}
                  onChange={(e) => handleInputChange('requerirEmail', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="requerirEmail" className="text-sm font-medium">
                  📧 Email obligatorio en registro
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requerirCargo"
                  checked={config.requerirCargo}
                  onChange={(e) => handleInputChange('requerirCargo', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="requerirCargo" className="text-sm font-medium">
                  💼 Cargo obligatorio en registro
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requerirEmpresa"
                  checked={config.requerirEmpresa}
                  onChange={(e) => handleInputChange('requerirEmpresa', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="requerirEmpresa" className="text-sm font-medium">
                  🏢 Empresa obligatoria en registro
                </label>
              </div>
            </div>
          </div>

          {/* Redes Sociales */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📱 Redes Sociales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📘 Facebook
                </label>
                <input
                  type="url"
                  value={config.redesSociales.facebook}
                  onChange={(e) => handleRedesSocialesChange('facebook', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://facebook.com/evento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🐦 Twitter
                </label>
                <input
                  type="url"
                  value={config.redesSociales.twitter}
                  onChange={(e) => handleRedesSocialesChange('twitter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://twitter.com/evento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📸 Instagram
                </label>
                <input
                  type="url"
                  value={config.redesSociales.instagram}
                  onChange={(e) => handleRedesSocialesChange('instagram', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://instagram.com/evento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💼 LinkedIn
                </label>
                <input
                  type="url"
                  value={config.redesSociales.linkedin}
                  onChange={(e) => handleRedesSocialesChange('linkedin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/company/evento"
                />
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">👀 Vista Previa</h2>
            
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              style={{ 
                borderColor: config.colorPrimario,
                background: `linear-gradient(135deg, ${config.colorPrimario}15, ${config.colorSecundario}15)`
              }}
            >
              {config.logoUrl && (
                <img 
                  src={config.logoUrl} 
                  alt="Logo" 
                  className="h-16 mx-auto mb-4"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              
              <h3 className="text-2xl font-bold mb-2" style={{ color: config.colorPrimario }}>
                {config.nombre}
              </h3>
              
              <p className="text-gray-600 mb-4">{config.descripcion}</p>
              
              <div className="space-y-2 text-sm text-gray-700">
                <p>📅 {new Date(config.fecha).toLocaleDateString('es-ES')}</p>
                <p>🕒 {config.horaInicio} - {config.horaFin}</p>
                <p>📍 {config.ubicacion}</p>
                <p>👥 {config.organizador}</p>
              </div>
              
              <div className="mt-4">
                <button 
                  className="px-6 py-2 text-white rounded-lg font-medium"
                  style={{ backgroundColor: config.colorPrimario }}
                >
                  Registrarse al Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 