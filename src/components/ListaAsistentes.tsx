'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import EditarAsistente from './EditarAsistente'

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

interface ListaAsistentesProps {
  asistentes: Asistente[]
  onMarcarAsistencia: (id: string) => void
  onImprimirEscarapela: (asistente: Asistente) => void
  onGenerarQR: (asistente: Asistente) => void
  onEditarAsistente?: (asistente: Asistente) => void
  onEliminarAsistente?: (id: string) => void
  loading: boolean
}

export default function ListaAsistentes({
  asistentes,
  onMarcarAsistencia,
  onImprimirEscarapela,
  onGenerarQR,
  onEditarAsistente,
  onEliminarAsistente,
  loading
}: ListaAsistentesProps) {
  const [asistenteEditando, setAsistenteEditando] = useState<Asistente | null>(null)
  const handleEditarAsistente = (asistente: Asistente) => {
    setAsistenteEditando(asistente)
  }

  const handleGuardarAsistente = async (asistenteActualizado: Asistente) => {
    if (onEditarAsistente) {
      await onEditarAsistente(asistenteActualizado)
      setAsistenteEditando(null)
    }
  }

  const handleEliminarAsistente = async (id: string) => {
    if (onEliminarAsistente) {
      await onEliminarAsistente(id)
      setAsistenteEditando(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando asistentes...</span>
      </div>
    )
  }

  if (asistentes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">👥</div>
        <p className="text-lg font-medium text-gray-700">No hay asistentes registrados</p>
        <p className="text-sm text-gray-500">Los asistentes aparecerán aquí cuando se registren</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {asistentes.map((asistente) => (
          <div
            key={asistente.id}
            className={`p-4 rounded-lg border-2 transition-all shadow-sm ${
              asistente.presente
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg text-gray-900">{asistente.nombre}</h3>
                  
                  {asistente.presente && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                      ✓ Presente
                    </span>
                  )}
                  
                  {asistente.escarapelaImpresa && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                      🖨️ Impresa
                    </span>
                  )}
                  
                  {asistente.qrGenerado && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-white">
                      📱 QR
                    </span>
                  )}
                </div>
                
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  {asistente.email && <div className="flex items-center gap-1">📧 <span>{asistente.email}</span></div>}
                  {asistente.cargo && <div className="flex items-center gap-1">💼 <span>{asistente.cargo}</span></div>}
                  {asistente.empresa && <div className="flex items-center gap-1">🏢 <span>{asistente.empresa}</span></div>}
                  {asistente.horaLlegada && (
                    <div className="flex items-center gap-1">
                      🕒 <span>Llegó: {format(new Date(asistente.horaLlegada), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleEditarAsistente(asistente)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  title="Editar asistente"
                >
                  ✏️ Editar
                </button>
                
                {!asistente.presente && (
                  <button
                    onClick={() => onMarcarAsistencia(asistente.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    ✓ Marcar Presente
                  </button>
                )}
                
                <button
                  onClick={() => onGenerarQR(asistente)}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  title="Generar código QR"
                >
                  📱 QR
                </button>
                
                <button
                  onClick={() => onImprimirEscarapela(asistente)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  🖨️ Escarapela
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edición */}
      {asistenteEditando && (
        <EditarAsistente
          asistente={asistenteEditando}
          onGuardar={handleGuardarAsistente}
          onCerrar={() => setAsistenteEditando(null)}
          onEliminar={onEliminarAsistente ? handleEliminarAsistente : undefined}
        />
      )}
    </>
  )
} 