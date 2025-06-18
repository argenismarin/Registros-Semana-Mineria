'use client'

import { useState, useRef } from 'react'
import { toast } from 'react-toastify'

interface AsistenteImportado {
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
}

interface ResultadoImportacion {
  exitosos: number
  errores: number
  duplicados: number
  detalles: string[]
}

export default function ImportarPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<AsistenteImportado[]>([])
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Procesar archivo CSV
  const procesarCSV = (contenido: string): AsistenteImportado[] => {
    const lineas = contenido.split('\n').filter(linea => linea.trim() !== '')
    
    if (lineas.length < 2) {
      throw new Error('El archivo debe tener al menos una cabecera y una línea de datos')
    }

    // Primera línea son las cabeceras
    const cabeceras = lineas[0].split(',').map(h => h.trim().toLowerCase())
    
    // Mapear las columnas
    const indiceNombre = cabeceras.findIndex(h => 
      h.includes('nombre') || h.includes('name') || h.includes('asistente')
    )
    const indiceEmail = cabeceras.findIndex(h => 
      h.includes('email') || h.includes('correo') || h.includes('mail')
    )
    const indiceCargo = cabeceras.findIndex(h => 
      h.includes('cargo') || h.includes('puesto') || h.includes('position')
    )
    const indiceEmpresa = cabeceras.findIndex(h => 
      h.includes('empresa') || h.includes('company') || h.includes('organización')
    )

    if (indiceNombre === -1) {
      throw new Error('No se encontró una columna de "nombre" en el CSV')
    }

    const asistentes: AsistenteImportado[] = []

    // Procesar cada línea de datos
    for (let i = 1; i < lineas.length; i++) {
      const valores = lineas[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (valores.length > indiceNombre && valores[indiceNombre].trim() !== '') {
        asistentes.push({
          nombre: valores[indiceNombre].trim(),
          email: indiceEmail >= 0 && valores[indiceEmail] ? valores[indiceEmail].trim() : undefined,
          cargo: indiceCargo >= 0 && valores[indiceCargo] ? valores[indiceCargo].trim() : undefined,
          empresa: indiceEmpresa >= 0 && valores[indiceEmpresa] ? valores[indiceEmpresa].trim() : undefined
        })
      }
    }

    return asistentes
  }

  // Manejar selección de archivo
  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV válido')
      return
    }

    setArchivo(file)
    setPreview([])
    setResultado(null)

    // Leer y procesar archivo
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const contenido = event.target?.result as string
        const asistentes = procesarCSV(contenido)
        setPreview(asistentes.slice(0, 10)) // Mostrar solo primeros 10 para preview
        toast.success(`${asistentes.length} asistentes detectados en el archivo`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error procesando archivo')
        setArchivo(null)
      }
    }
    reader.readAsText(file)
  }

  // Importar asistentes
  const importarAsistentes = async () => {
    if (!archivo) return

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const contenido = event.target?.result as string
          const asistentes = procesarCSV(contenido)

          // Enviar al servidor
          const response = await fetch('/api/asistentes/importar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asistentes })
          })

          const resultado = await response.json()
          
          if (response.ok) {
            setResultado(resultado)
            toast.success(`Importación completada: ${resultado.exitosos} exitosos`)
          } else {
            toast.error(resultado.error || 'Error importando asistentes')
          }
        } catch (error) {
          toast.error('Error procesando la importación')
        } finally {
          setLoading(false)
        }
      }
      reader.readAsText(archivo)
    } catch (error) {
      toast.error('Error leyendo archivo')
      setLoading(false)
    }
  }

  // Descargar plantilla CSV
  const descargarPlantilla = () => {
    const csvContent = 'nombre,email,cargo,empresa\n' +
      'Juan Pérez,juan@empresa.com,Ingeniero,Empresa ABC\n' +
      'María González,maria@corp.com,Gerente,Corporación XYZ\n' +
      'Carlos Rodríguez,carlos@startup.com,Desarrollador,StartUp Tech'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla-asistentes.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Plantilla CSV descargada')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📁 Importar Asistentes</h1>
              <p className="text-gray-600">Carga masiva desde archivo CSV</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={descargarPlantilla}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                📄 Descargar Plantilla
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
        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">📋 Instrucciones</h2>
          <div className="space-y-2 text-blue-800">
            <p>• El archivo debe estar en formato <strong>CSV</strong> (separado por comas)</p>
            <p>• Debe incluir una <strong>cabecera</strong> con los nombres de las columnas</p>
            <p>• La columna <strong>"nombre"</strong> es obligatoria</p>
            <p>• Columnas opcionales: email, cargo, empresa</p>
            <p>• Descarga la plantilla para ver el formato correcto</p>
          </div>
        </div>

        {/* Subir archivo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📤 Seleccionar Archivo CSV</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleArchivoSeleccionado}
              className="hidden"
            />
            
            {!archivo ? (
              <div>
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600 mb-4">
                  Haz clic para seleccionar un archivo CSV o arrástralo aquí
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Seleccionar Archivo
                </button>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-900 font-medium mb-2">{archivo.name}</p>
                <p className="text-gray-600 mb-4">
                  {(archivo.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
                  >
                    Cambiar Archivo
                  </button>
                  <button
                    onClick={importarAsistentes}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
                  >
                    {loading ? 'Importando...' : 'Importar Asistentes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview de datos */}
        {preview.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">👀 Vista Previa (primeros 10)</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((asistente, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {asistente.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {asistente.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {asistente.cargo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {asistente.empresa || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resultados de importación */}
        {resultado && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Resultados de Importación</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{resultado.exitosos}</div>
                <div className="text-sm text-green-800">Exitosos</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{resultado.errores}</div>
                <div className="text-sm text-red-800">Errores</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{resultado.duplicados}</div>
                <div className="text-sm text-yellow-800">Duplicados</div>
              </div>
            </div>

            {resultado.detalles.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Detalles:</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {resultado.detalles.map((detalle, index) => (
                    <p key={index} className="text-sm text-gray-700 mb-1">
                      {detalle}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <a
                href="/"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Ver Lista de Asistentes
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 