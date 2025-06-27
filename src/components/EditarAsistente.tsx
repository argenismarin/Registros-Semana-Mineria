'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  horaLlegada?: string
  presente: boolean
  escarapelaImpresa: boolean
  fechaRegistro: string
  fechaImpresion?: string
  qrGenerado?: boolean
  fechaGeneracionQR?: string
}

interface EditarAsistenteProps {
  asistente: Asistente
  onGuardar: (asistente: Asistente) => void
  onCerrar: () => void
  onEliminar?: (id: string) => void
}

export default function EditarAsistente({ 
  asistente, 
  onGuardar, 
  onCerrar, 
  onEliminar 
}: EditarAsistenteProps) {
  const [formData, setFormData] = useState({
    nombre: asistente.nombre,
    email: asistente.email || '',
    cargo: asistente.cargo || '',
    empresa: asistente.empresa || '',
    presente: asistente.presente,
    escarapelaImpresa: asistente.escarapelaImpresa,
    qrGenerado: asistente.qrGenerado || false
  })

  // Opciones de cargo predefinidas
  const opcionesCargo = [
    'Asistente',
    'Muestra Comercial',
    'Ponente',
    'Organizador',
    'Prensa',
    'Asistente Patrocinador'
  ]
  
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!formData.cargo.trim()) {
      toast.error('Debe seleccionar un cargo')
      return
    }

    setGuardando(true)
    try {
      const asistenteActualizado = {
        ...asistente,
        ...formData,
        horaLlegada: formData.presente && !asistente.presente 
          ? new Date().toISOString() 
          : asistente.horaLlegada,
        fechaImpresion: formData.escarapelaImpresa && !asistente.escarapelaImpresa
          ? new Date().toISOString()
          : asistente.fechaImpresion,
        fechaGeneracionQR: formData.qrGenerado && !asistente.qrGenerado
          ? new Date().toISOString()
          : asistente.fechaGeneracionQR
      }

      // Llamar al endpoint de actualización
      const response = await fetch(`/api/asistentes/${asistente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asistenteActualizado)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error actualizando asistente')
      }

      const resultado = await response.json()
      
      // Llamar callback para actualizar la UI
      await onGuardar(resultado.asistente)
      
      toast.success('✅ Asistente actualizado y sincronizado con Google Sheets')
      onCerrar()
    } catch (error) {
      console.error('Error actualizando asistente:', error)
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!onEliminar) return
    
    setEliminando(true)
    try {
      // Llamar al endpoint de eliminación
      const response = await fetch(`/api/asistentes/${asistente.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error eliminando asistente')
      }

      // Llamar callback para actualizar la UI
      await onEliminar(asistente.id)
      
      toast.success('✅ Asistente eliminado y sincronizado con Google Sheets')
      onCerrar()
    } catch (error) {
      console.error('Error eliminando asistente:', error)
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setEliminando(false)
      setMostrarConfirmacion(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const resetearEstados = () => {
    setFormData(prev => ({
      ...prev,
      presente: false,
      escarapelaImpresa: false,
      qrGenerado: false
    }))
  }

  const marcarTodo = () => {
    setFormData(prev => ({
      ...prev,
      presente: true,
      escarapelaImpresa: true,
      qrGenerado: true
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">✏️ Editar Asistente</h2>
          <button
            onClick={onCerrar}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Banner informativo sobre sincronización */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="text-blue-600">📊</div>
            <div className="text-sm text-blue-800">
              <strong>Sincronización automática:</strong> Los cambios se guardarán en memoria local y Google Sheets
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-4 text-gray-800">👤 Información Personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo *
                </label>
                <select
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value="">Seleccione un cargo...</option>
                  {opcionesCargo.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa/Organización
                </label>
                <input
                  type="text"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Estados del Asistente */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-gray-800">🎯 Estados del Asistente</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetearEstados}
                  className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition"
                >
                  🔄 Resetear Todo
                </button>
                <button
                  type="button"
                  onClick={marcarTodo}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition"
                >
                  ✅ Marcar Todo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-md border">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="presente"
                    checked={formData.presente}
                    onChange={handleChange}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">🎯 Presente</span>
                    <p className="text-sm text-gray-600">Ha llegado al evento</p>
                  </div>
                </label>
              </div>

              <div className="bg-white p-3 rounded-md border">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="escarapelaImpresa"
                    checked={formData.escarapelaImpresa}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">🖨️ Escarapela Impresa</span>
                    <p className="text-sm text-gray-600">Escarapela generada</p>
                  </div>
                </label>
              </div>

              <div className="bg-white p-3 rounded-md border">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="qrGenerado"
                    checked={formData.qrGenerado}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">📱 QR Generado</span>
                    <p className="text-sm text-gray-600">Código QR creado</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Información de Fechas */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800">📅 Historial de Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded border">
                <span className="font-medium text-gray-700">📝 Fecha de Registro:</span>
                <p className="text-gray-600">{new Date(asistente.fechaRegistro).toLocaleString('es-ES')}</p>
              </div>
              
              {asistente.horaLlegada && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">🕒 Hora de Llegada:</span>
                  <p className="text-gray-600">{new Date(asistente.horaLlegada).toLocaleString('es-ES')}</p>
                </div>
              )}
              
              {asistente.fechaImpresion && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">🖨️ Fecha Impresión:</span>
                  <p className="text-gray-600">{new Date(asistente.fechaImpresion).toLocaleString('es-ES')}</p>
                </div>
              )}
              
              {asistente.fechaGeneracionQR && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">📱 Fecha QR:</span>
                  <p className="text-gray-600">{new Date(asistente.fechaGeneracionQR).toLocaleString('es-ES')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition"
              >
                {guardando ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando y sincronizando...
                  </span>
                ) : (
                  '💾 Guardar y Sincronizar'
                )}
              </button>
              
              <button
                type="button"
                onClick={onCerrar}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-md transition"
              >
                Cancelar
              </button>
            </div>

            {onEliminar && (
              <button
                type="button"
                onClick={() => setMostrarConfirmacion(true)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition"
              >
                🗑️ Eliminar Asistente
              </button>
            )}
          </div>
        </form>

        {/* Modal de Confirmación de Eliminación */}
        {mostrarConfirmacion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">⚠️ Confirmar Eliminación</h3>
              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que quieres eliminar a <strong>{asistente.nombre}</strong>? 
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setMostrarConfirmacion(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={eliminando}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition"
                >
                  {eliminando ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Eliminando...
                    </span>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 