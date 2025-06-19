'use client'

import { useState } from 'react'

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

interface SelectorPosicionEscarapelaProps {
  asistente: Asistente
  onConfirmar: (posicion: number) => void
  onCancelar: () => void
}

export default function SelectorPosicionEscarapela({
  asistente,
  onConfirmar,
  onCancelar
}: SelectorPosicionEscarapelaProps) {
  const [posicionSeleccionada, setPosicionSeleccionada] = useState<number | null>(null)

  const handleConfirmar = () => {
    if (posicionSeleccionada !== null) {
      onConfirmar(posicionSeleccionada)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                🖨️ Seleccionar Posición de Escarapela
              </h2>
              <p className="text-gray-600 mt-1">
                Elige dónde imprimir la escarapela de <span className="font-semibold">{asistente.nombre}</span>
              </p>
            </div>
            <button
              onClick={onCancelar}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Información del asistente */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">👤 Información del Asistente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><strong>Nombre:</strong> {asistente.nombre}</div>
              {asistente.cargo && <div><strong>Cargo:</strong> {asistente.cargo}</div>}
              {asistente.empresa && <div><strong>Empresa:</strong> {asistente.empresa}</div>}
              {asistente.email && <div><strong>Email:</strong> {asistente.email}</div>}
            </div>
          </div>

          {/* Matriz de posiciones */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              📍 Selecciona la posición en la matriz (11 filas × 3 columnas)
            </h3>
            
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              {Array.from({ length: 33 }, (_, index) => {
                const fila = Math.floor(index / 3) + 1
                const columna = (index % 3) + 1
                const isSelected = posicionSeleccionada === index
                
                return (
                  <button
                    key={index}
                    onClick={() => setPosicionSeleccionada(index)}
                    className={`
                      h-16 border-2 rounded-lg text-xs font-medium transition-all duration-200
                      flex flex-col items-center justify-center
                      ${isSelected
                        ? 'border-blue-500 bg-blue-100 text-blue-700 shadow-md scale-105'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-600'
                      }
                    `}
                  >
                    <div className="font-bold">{index + 1}</div>
                    <div className="text-xs opacity-75">
                      F{fila}-C{columna}
                    </div>
                  </button>
                )
              })}
            </div>

            {posicionSeleccionada !== null && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
                  📍 Posición seleccionada: <strong className="ml-1">
                    {posicionSeleccionada + 1} (Fila {Math.floor(posicionSeleccionada / 3) + 1}, Columna {(posicionSeleccionada % 3) + 1})
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancelar}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
            >
              ❌ Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={posicionSeleccionada === null}
              className={`
                px-6 py-3 rounded-lg font-medium transition duration-200
                ${posicionSeleccionada !== null
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              🖨️ Generar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 