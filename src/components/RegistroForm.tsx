'use client'

import { useState } from 'react'
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

interface RegistroFormProps {
  onAgregarAsistente: (nuevoAsistente: Omit<Asistente, 'id' | 'presente' | 'escarapelaImpresa' | 'fechaRegistro' | 'fechaImpresion' | 'qrGenerado' | 'fechaGeneracionQR'>) => void
}

export default function RegistroForm({ onAgregarAsistente }: RegistroFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    cargo: '',
    empresa: '',
  })
  const [loading, setLoading] = useState(false)

  // Opciones de cargo predefinidas
  const opcionesCargo = [
    'Asistente',
    'Muestra Comercial',
    'Ponente',
    'Organizador',
    'Prensa',
    'Asistente Patrocinador'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!formData.cargo.trim()) {
      toast.error('Debe seleccionar una modalidad')
      return
    }

    setLoading(true)
    try {
      await onAgregarAsistente(formData)
      
      // Limpiar formulario después del registro exitoso
      setFormData({
        nombre: '',
        email: '',
        cargo: '',
        empresa: '',
      })
    } catch (error) {
      toast.error('Error registrando asistente')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre completo *
        </label>
        <input
          type="text"
          id="nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          placeholder="Ingrese el nombre completo"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div>
        <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
          Modalidad *
        </label>
        <select
          id="cargo"
          name="cargo"
          value={formData.cargo}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
        >
          <option value="">Seleccione una modalidad...</option>
          {opcionesCargo.map((cargo) => (
            <option key={cargo} value={cargo}>
              {cargo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-1">
          Empresa/Organización
        </label>
        <input
          type="text"
          id="empresa"
          name="empresa"
          value={formData.empresa}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          placeholder="Nombre de la empresa"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {loading ? 'Registrando...' : 'Registrar Asistente'}
      </button>
    </form>
  )
} 