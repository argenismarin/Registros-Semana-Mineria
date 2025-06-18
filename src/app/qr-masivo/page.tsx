'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  presente: boolean
  escarapelaImpresa: boolean
  fechaRegistro: string
  qrGenerado?: boolean
}

interface OpcionesQR {
  incluirTodos: boolean
  incluirSoloNoPresentes: boolean
  incluirSoloPendientesQR: boolean
  empresaFiltro: string
  formatoImpresion: 'stickers' | 'tarjetas' | 'badges' | 'custom'
  tamanoQR: 'pequeno' | 'mediano' | 'grande'
  incluyeNombre: boolean
  incluyeEmpresa: boolean
  incluyeCargo: boolean
  copiasPorasistente: number
  columnas: number
  filas: number
  enviarImpresora: boolean
  nombreImpresora: string
}

export default function QRMasivoPage() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [opciones, setOpciones] = useState<OpcionesQR>({
    incluirTodos: true,
    incluirSoloNoPresentes: false,
    incluirSoloPendientesQR: false,
    empresaFiltro: '',
    formatoImpresion: 'stickers',
    tamanoQR: 'mediano',
    incluyeNombre: true,
    incluyeEmpresa: true,
    incluyeCargo: false,
    copiasPorasistente: 1,
    columnas: 3,
    filas: 8,
    enviarImpresora: false,
    nombreImpresora: ''
  })

  const [impresoras, setImpresoras] = useState<string[]>([])
  const [preview, setPreview] = useState<Asistente[]>([])

  useEffect(() => {
    cargarAsistentes()
    obtenerImpresoras()
  }, [])

  useEffect(() => {
    filtrarAsistentes()
  }, [asistentes, opciones])

  const cargarAsistentes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/asistentes')
      const data = await response.json()
      setAsistentes(data)
    } catch (error) {
      toast.error('Error cargando asistentes')
    } finally {
      setLoading(false)
    }
  }

  const obtenerImpresoras = async () => {
    try {
      const response = await fetch('/api/impresoras')
      if (response.ok) {
        const data = await response.json()
        setImpresoras(data.impresoras || [])
      }
    } catch (error) {
      console.log('Error obteniendo impresoras:', error)
    }
  }

  const filtrarAsistentes = () => {
    let filtrados = [...asistentes]

    if (opciones.incluirSoloNoPresentes) {
      filtrados = filtrados.filter(a => !a.presente)
    }

    if (opciones.incluirSoloPendientesQR) {
      filtrados = filtrados.filter(a => !a.qrGenerado)
    }

    if (opciones.empresaFiltro && opciones.empresaFiltro.trim() !== '') {
      filtrados = filtrados.filter(a => 
        a.empresa?.toLowerCase().includes(opciones.empresaFiltro.toLowerCase())
      )
    }

    setPreview(filtrados)
  }

  const generarQRMasivo = async () => {
    if (preview.length === 0) {
      toast.error('No hay asistentes para generar QR')
      return
    }

    setGenerando(true)
    try {
      const response = await fetch('/api/qr/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asistentes: preview,
          opciones
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        
        if (opciones.enviarImpresora && opciones.nombreImpresora) {
          const formData = new FormData()
          formData.append('pdf', blob)
          formData.append('impresora', opciones.nombreImpresora)
          
          const printResponse = await fetch('/api/imprimir', {
            method: 'POST',
            body: formData
          })
          
          if (printResponse.ok) {
            toast.success(`Códigos QR enviados a impresora: ${opciones.nombreImpresora}`)
          } else {
            throw new Error('Error enviando a impresora')
          }
        } else {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `codigos-qr-masivo-${new Date().toISOString().split('T')[0]}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          toast.success(`PDF con ${preview.length} códigos QR generado`)
        }

        await fetch('/api/qr/marcar-generados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asistentesIds: preview.map(a => a.id)
          })
        })

      } else {
        throw new Error('Error generando PDF')
      }
    } catch (error) {
      toast.error('Error en la generación masiva de QR')
    } finally {
      setGenerando(false)
    }
  }

  const empresasDisponibles = Array.from(
    new Set(asistentes.map(a => a.empresa).filter(e => e && e.trim() !== ''))
  ).sort()

  const formatosInfo = {
    stickers: { nombre: 'Stickers Circulares', tamaño: '5cm x 5cm', descripcion: 'Ideales para adherir a gafetes' },
    tarjetas: { nombre: 'Tarjetas Rectangulares', tamaño: '8.5cm x 5.5cm', descripcion: 'Formato tarjeta de visita' },
    badges: { nombre: 'Badges Corporativos', tamaño: '10cm x 7cm', descripcion: 'Con información completa' },
    custom: { nombre: 'Personalizado', tamaño: 'Variable', descripcion: 'Configuración manual' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando asistentes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📱 Generación Masiva de QR</h1>
              <p className="text-gray-600">Genera e imprime códigos QR para todos los asistentes</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={generarQRMasivo}
                disabled={generando || preview.length === 0}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {generando ? '🔄 Generando...' : '🖨️ Generar e Imprimir'}
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">🔍 Filtros de Asistentes</h2>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filtroTipo"
                      checked={opciones.incluirTodos}
                      onChange={() => setOpciones(prev => ({
                        ...prev,
                        incluirTodos: true,
                        incluirSoloNoPresentes: false,
                        incluirSoloPendientesQR: false
                      }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">👥 Todos los asistentes</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filtroTipo"
                      checked={opciones.incluirSoloNoPresentes}
                      onChange={() => setOpciones(prev => ({
                        ...prev,
                        incluirTodos: false,
                        incluirSoloNoPresentes: true,
                        incluirSoloPendientesQR: false
                      }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">⏳ Solo no presentes</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filtroTipo"
                      checked={opciones.incluirSoloPendientesQR}
                      onChange={() => setOpciones(prev => ({
                        ...prev,
                        incluirTodos: false,
                        incluirSoloNoPresentes: false,
                        incluirSoloPendientesQR: true
                      }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">📱 Sin QR generado</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filtrar por Empresa
                  </label>
                  <select
                    value={opciones.empresaFiltro}
                    onChange={(e) => setOpciones(prev => ({ ...prev, empresaFiltro: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas las empresas</option>
                    {empresasDisponibles.map(empresa => (
                      <option key={empresa} value={empresa}>{empresa}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">📐 Formato de Impresión</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.entries(formatosInfo).map(([key, info]) => (
                  <div
                    key={key}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      opciones.formatoImpresion === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setOpciones(prev => ({ ...prev, formatoImpresion: key as any }))}
                  >
                    <h3 className="font-medium text-gray-900">{info.nombre}</h3>
                    <p className="text-sm text-gray-600">{info.tamaño}</p>
                    <p className="text-xs text-gray-500">{info.descripcion}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño del QR
                  </label>
                  <select
                    value={opciones.tamanoQR}
                    onChange={(e) => setOpciones(prev => ({ ...prev, tamanoQR: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pequeno">Pequeño (2cm)</option>
                    <option value="mediano">Mediano (3cm)</option>
                    <option value="grande">Grande (4cm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Columnas por página
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={opciones.columnas}
                    onChange={(e) => setOpciones(prev => ({ ...prev, columnas: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filas por página
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={opciones.filas}
                    onChange={(e) => setOpciones(prev => ({ ...prev, filas: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">📄 Información a Incluir</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={opciones.incluyeNombre}
                      onChange={(e) => setOpciones(prev => ({ ...prev, incluyeNombre: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">👤 Nombre del asistente</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={opciones.incluyeEmpresa}
                      onChange={(e) => setOpciones(prev => ({ ...prev, incluyeEmpresa: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">🏢 Empresa</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={opciones.incluyeCargo}
                      onChange={(e) => setOpciones(prev => ({ ...prev, incluyeCargo: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">💼 Cargo</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Copias por asistente
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={opciones.copiasPorasistente}
                    onChange={(e) => setOpciones(prev => ({ ...prev, copiasPorasistente: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Útil para backup o múltiples ubicaciones</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">🖨️ Configuración de Impresora</h2>
              
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opciones.enviarImpresora}
                    onChange={(e) => setOpciones(prev => ({ ...prev, enviarImpresora: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium">Enviar automáticamente a impresora</span>
                </label>

                {opciones.enviarImpresora && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seleccionar Impresora
                    </label>
                    <select
                      value={opciones.nombreImpresora}
                      onChange={(e) => setOpciones(prev => ({ ...prev, nombreImpresora: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar impresora...</option>
                      {impresoras.map(impresora => (
                        <option key={impresora} value={impresora}>{impresora}</option>
                      ))}
                    </select>
                    {impresoras.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ No se detectaron impresoras. El PDF se descargará para impresión manual.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">📊 Resumen</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{preview.length}</div>
                    <div className="text-sm text-blue-800">Asistentes seleccionados</div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {preview.length * opciones.copiasPorasistente}
                    </div>
                    <div className="text-sm text-green-800">Total códigos QR a generar</div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">
                      {Math.ceil((preview.length * opciones.copiasPorasistente) / (opciones.columnas * opciones.filas))}
                    </div>
                    <div className="text-sm text-purple-800">Páginas estimadas</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Vista previa (primeros 5):</h3>
                  <div className="space-y-1 text-sm">
                    {preview.slice(0, 5).map(asistente => (
                      <div key={asistente.id} className="text-gray-700">
                        • {asistente.nombre}
                        {asistente.empresa && ` (${asistente.empresa})`}
                      </div>
                    ))}
                    {preview.length > 5 && (
                      <div className="text-gray-500 italic">
                        ... y {preview.length - 5} más
                      </div>
                    )}
                  </div>
                </div>

                {preview.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>No hay asistentes que cumplan los filtros seleccionados</p>
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