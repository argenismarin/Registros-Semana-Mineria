import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function POST() {
  try {
    console.log('🔄 Iniciando sincronización manual con Google Sheets...')

    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json({ 
        error: 'Google Sheets no está configurado',
        configurado: false 
      }, { status: 400 })
    }

    // Obtener datos actuales de memoria
    const memoryAsistentes = db.getAllAsistentes()
    console.log(`📊 ${memoryAsistentes.length} asistentes en memoria local`)

    // Sincronizar con Google Sheets
    const sincronizados = await googleSheetsService.syncWithMemoryDatabase(memoryAsistentes)
    
    // Solo actualizar la base de datos si hay datos sincronizados
    if (sincronizados && sincronizados.length > 0) {
      // Limpiar y actualizar la base de datos local
      db.limpiarTodo()
      sincronizados.forEach(asistente => {
        db.addAsistente(asistente)
      })
    } else if (memoryAsistentes.length === 0) {
      // Si no hay datos en memoria ni en Sheets, no hacer nada
      console.log('📝 No hay datos para sincronizar')
    }

    // Calcular estadísticas de sincronización
    const datosFinales = db.getAllAsistentes() // Obtener datos actuales después de sincronización
    const escarapelasImpresas = datosFinales.filter(a => a.escarapelaImpresa).length
    const escarapelasPendientes = datosFinales.length - escarapelasImpresas

    console.log(`✅ Sincronización completada: ${datosFinales.length} asistentes en total`)
    
    return NextResponse.json({
      success: true,
      message: 'Sincronización con Google Sheets completada exitosamente',
      estadisticas: {
        totalAsistentes: datosFinales.length,
        enMemoriaAntes: memoryAsistentes.length,
        sincronizadosDesdeSheets: (sincronizados && sincronizados.length) || 0,
        escarapelasImpresas,
        escarapelasPendientes,
        porcentajeImpresas: datosFinales.length > 0 ? Math.round((escarapelasImpresas / datosFinales.length) * 100) : 0
      },
      configurado: true,
      fechaSincronizacion: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en sincronización manual:', error)
    return NextResponse.json(
      { 
        error: 'Error en la sincronización con Google Sheets',
        detalles: error instanceof Error ? error.message : 'Error desconocido',
        configurado: googleSheetsService.isConfigured()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const configurado = googleSheetsService.isConfigured()
    const asistentes = db.getAllAsistentes()
    const escarapelasImpresas = asistentes.filter(a => a.escarapelaImpresa).length
    
    return NextResponse.json({
      configurado,
      estadisticas: {
        totalAsistentes: asistentes.length,
        escarapelasImpresas,
        escarapelasPendientes: asistentes.length - escarapelasImpresas,
        porcentajeImpresas: asistentes.length > 0 ? Math.round((escarapelasImpresas / asistentes.length) * 100) : 0
      },
      ultimaActualizacion: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de sincronización:', error)
    return NextResponse.json(
      { error: 'Error obteniendo estado de sincronización' },
      { status: 500 }
    )
  }
} 