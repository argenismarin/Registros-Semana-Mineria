'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import Link from 'next/link'

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
}

interface ConfiguracionEvento {
  // Configuración simplificada - solo para 98mm x 128mm
}

export default function EscarapelasPage() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([])
  const [asistentesFiltrados, setAsistentesFiltrados] = useState<Asistente[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  
  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [soloSeleccionados, setSoloSeleccionados] = useState(false)
  
  // Solo selección de asistentes (sin matriz de posiciones)
  const [asistentesSeleccionados, setAsistentesSeleccionados] = useState<string[]>([])

  // Cargar asistentes
  useEffect(() => {
    cargarAsistentes()
  }, [])

  // Debug: Mostrar información de asistentes en consola (temporal)
  useEffect(() => {
    if (asistentes.length > 0) {
      console.log(`✅ Escarapelas: ${asistentes.length} asistentes disponibles`)
    } else if (!loading) {
      console.log('⚠️ Escarapelas: No hay asistentes disponibles')
    }
  }, [asistentes, loading])

  // Aplicar filtros
  useEffect(() => {
    let filtrados = [...asistentes]
    
    if (filtroNombre) {
      filtrados = filtrados.filter(a => 
        a.nombre.toLowerCase().includes(filtroNombre.toLowerCase())
      )
    }
    
    if (filtroEmpresa) {
      filtrados = filtrados.filter(a => 
        a.empresa?.toLowerCase().includes(filtroEmpresa.toLowerCase())
      )
    }
    
    if (soloSeleccionados) {
      filtrados = filtrados.filter(a => asistentesSeleccionados.includes(a.id))
    }
    
    setAsistentesFiltrados(filtrados)
  }, [asistentes, filtroNombre, filtroEmpresa, soloSeleccionados, asistentesSeleccionados])

  const cargarAsistentes = async () => {
    try {
      const response = await fetch('/api/asistentes', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data: Asistente[] = await response.json()
        setAsistentes(data)
        
        if (data.length === 0) {
          toast.info('No hay asistentes registrados. Ve a la página principal para registrar asistentes.')
        }
      } else {
        console.error('❌ Error en respuesta:', response.status)
        toast.error(`Error del servidor: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Error cargando asistentes:', error)
      toast.error('Error de conexión al cargar asistentes')
    } finally {
      setLoading(false)
    }
  }

  const toggleAsistente = (asistenteId: string) => {
    setAsistentesSeleccionados(prev => {
      if (prev.includes(asistenteId)) {
        return prev.filter(id => id !== asistenteId)
      } else {
        return [...prev, asistenteId]
      }
    })
  }

  const seleccionarTodosAsistentes = () => {
    setAsistentesSeleccionados(asistentesFiltrados.map(a => a.id))
  }

  const limpiarSeleccionAsistentes = () => {
    setAsistentesSeleccionados([])
  }

  const generarPDFEscarapelas = async () => {
    if (asistentesSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un asistente')
      return
    }

    setGenerando(true)

    try {
      const asistentesDatos = asistentes.filter(a => asistentesSeleccionados.includes(a.id))
      
      const response = await fetch('/api/reportes/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asistentes: asistentesDatos,
          opciones: {
            modoImpresion: 'directa'
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `escarapelas-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast.success(`PDF generado con ${asistentesDatos.length} escarapelas (98mm×128mm)`)
      } else {
        throw new Error('Error generando PDF')
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error generando PDF de escarapelas')
    } finally {
      setGenerando(false)
    }
  }

  const empresasDisponibles = Array.from(
    new Set(asistentes.map(a => a.empresa).filter(e => e && e.trim() !== ''))
  ).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando asistentes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏷️ Generador de Escarapelas</h1>
              <p className="mt-2 text-gray-600">
                Formato: 98mm × 128mm - Una escarapela por página
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel de Control Simplificado */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Información del formato */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">📏</div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Formato de Escarapela</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• Tamaño: 98mm × 128mm</div>
                    <div>• Una escarapela por página</div>
                    <div>• Área de texto posicionada exactamente</div>
                    <div>• Listo para impresión directa</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón de Generación */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={generarPDFEscarapelas}
                disabled={generando || asistentesSeleccionados.length === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {generando ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generando PDF...
                  </span>
                ) : (
                  `📄 Generar PDF (${asistentesSeleccionados.length} escarapelas)`
                )}
              </button>
            </div>
          </div>

          {/* Panel de Asistentes */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">👥 Selección de Asistentes</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={seleccionarTodosAsistentes}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Todos
                    </button>
                    <button
                      onClick={limpiarSeleccionAsistentes}
                      className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <select
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas las empresas</option>
                    {empresasDisponibles.map(empresa => (
                      <option key={empresa} value={empresa}>{empresa}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={soloSeleccionados}
                      onChange={(e) => setSoloSeleccionados(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Solo seleccionados</span>
                  </label>
                </div>

                <div className="text-sm text-gray-600">
                  Mostrando {asistentesFiltrados.length} de {asistentes.length} asistentes
                  ({asistentesSeleccionados.length} seleccionados)
                </div>
              </div>

              {/* Lista de Asistentes */}
              <div className="max-h-96 overflow-y-auto">
                {asistentesFiltrados.map((asistente) => (
                  <div
                    key={asistente.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      asistentesSeleccionados.includes(asistente.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => toggleAsistente(asistente.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={asistentesSeleccionados.includes(asistente.id)}
                        onChange={() => toggleAsistente(asistente.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{asistente.nombre}</div>
                        <div className="text-sm text-gray-600">
                          {asistente.cargo && <span>{asistente.cargo}</span>}
                          {asistente.cargo && asistente.empresa && <span> • </span>}
                          {asistente.empresa && <span>{asistente.empresa}</span>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {asistente.presente ? '✅ Presente' : '⏳ Pendiente'}
                      </div>
                    </div>
                  </div>
                ))}

                {asistentesFiltrados.length === 0 && asistentes.length === 0 && !loading && (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay asistentes registrados</h3>
                    <p className="text-gray-600 mb-4">
                      Primero debes registrar asistentes desde la página principal
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      ← Ir a registrar asistentes
                    </Link>
                  </div>
                )}

                {asistentesFiltrados.length === 0 && asistentes.length > 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron asistentes</h3>
                    <p className="text-gray-600">
                      Ajusta los filtros para mostrar más resultados
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}