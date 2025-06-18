'use client'

import { useState, useEffect } from 'react'
import { Asistente } from '@/lib/database'

interface Estadisticas {
  totalRegistrados: number
  totalAsistieron: number
  qrGenerados: number
  porcentajeAsistencia: number
}

export default function ReportesPage() {
  const [asistentes, setAsistentes] = useState<Asistente[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalRegistrados: 0,
    totalAsistieron: 0,
    qrGenerados: 0,
    porcentajeAsistencia: 0
  })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'asistieron' | 'noAsistieron'>('todos')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar asistentes
      const responseAsistentes = await fetch('/api/asistentes')
      const dataAsistentes = await responseAsistentes.json()
      
      if (dataAsistentes.success) {
        setAsistentes(dataAsistentes.asistentes)
      }

      // Cargar estadísticas
      const responseStats = await fetch('/api/asistentes?stats=true')
      const dataStats = await responseStats.json()
      
      if (dataStats.success) {
        setEstadisticas(dataStats.estadisticas)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const asistentesFiltrados = asistentes.filter(asistente => {
    switch (filtro) {
      case 'asistieron':
        return asistente.presente
      case 'noAsistieron':
        return !asistente.presente
      default:
        return true
    }
  })

  const descargarReportePDF = async () => {
    try {
      const response = await fetch('/api/reportes/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ asistentes: asistentesFiltrados })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-asistentes-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error descargando reporte:', error)
      alert('Error al descargar el reporte')
    }
  }

  const descargarReporteCSV = () => {
    const headers = ['ID', 'Nombre', 'Email', 'Empresa', 'Cargo', 'Presente', 'Hora Llegada', 'QR Generado']
    const rows = asistentesFiltrados.map(asistente => [
      asistente.id,
      asistente.nombre,
      asistente.email || '',
      asistente.empresa || '',
      asistente.cargo || '',
      asistente.presente ? 'Sí' : 'No',
      asistente.horaLlegada || '',
      asistente.qrGenerado ? 'Sí' : 'No'
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-asistentes-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            📊 Reportes y Estadísticas
          </h1>

          {/* Estadísticas generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {estadisticas.totalRegistrados}
              </div>
              <div className="text-sm text-gray-600">Total Registrados</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {estadisticas.totalAsistieron}
              </div>
              <div className="text-sm text-gray-600">Asistieron</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {estadisticas.qrGenerados}
              </div>
              <div className="text-sm text-gray-600">QR Generados</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {estadisticas.porcentajeAsistencia.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">% Asistencia</div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFiltro('todos')}
                className={`px-4 py-2 rounded-lg ${
                  filtro === 'todos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos ({asistentes.length})
              </button>
              <button
                onClick={() => setFiltro('asistieron')}
                className={`px-4 py-2 rounded-lg ${
                  filtro === 'asistieron'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Asistieron ({asistentes.filter(a => a.presente).length})
              </button>
              <button
                onClick={() => setFiltro('noAsistieron')}
                className={`px-4 py-2 rounded-lg ${
                  filtro === 'noAsistieron'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                No Asistieron ({asistentes.filter(a => !a.presente).length})
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={descargarReporteCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                📊 Descargar CSV
              </button>
              <button
                onClick={descargarReportePDF}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                📄 Descargar PDF
              </button>
            </div>
          </div>

          {/* Tabla de asistentes */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Empresa</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Estado</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Hora Llegada</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">QR</th>
                </tr>
              </thead>
              <tbody>
                {asistentesFiltrados.map((asistente, index) => (
                  <tr key={asistente.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2">{asistente.nombre}</td>
                    <td className="border border-gray-300 px-4 py-2">{asistente.email || '-'}</td>
                    <td className="border border-gray-300 px-4 py-2">{asistente.empresa || '-'}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        asistente.presente
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {asistente.presente ? '✅ Asistió' : '❌ No asistió'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {asistente.horaLlegada 
                        ? new Date(asistente.horaLlegada).toLocaleTimeString()
                        : '-'
                      }
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        asistente.qrGenerado
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {asistente.qrGenerado ? '📱 Sí' : '⚪ No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {asistentesFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay asistentes que coincidan con el filtro seleccionado.
            </div>
          )}
        </div>

        {/* Botón volver */}
        <div className="text-center">
          <button
            onClick={() => window.history.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg"
          >
            ← Volver al Panel Principal
          </button>
        </div>
      </div>
    </div>
  )
} 