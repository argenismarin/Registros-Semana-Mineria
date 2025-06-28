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
    const memoryAsistentes = db.getAsistentes()
    console.log(`📊 ${memoryAsistentes.length} asistentes en memoria local`)

    // Sincronizar con Google Sheets
    const sincronizados = await googleSheetsService.syncWithMemoryDatabase(memoryAsistentes)
    
    // Limpiar y actualizar la base de datos local
    db.limpiarTodo()
    sincronizados.forEach(asistente => {
      db.addAsistente(asistente)
    })

    // Calcular estadísticas de sincronización
    const escarapelasImpresas = sincronizados.filter(a => a.escarapelaImpresa).length
    const escarapelasPendientes = sincronizados.length - escarapelasImpresas

    console.log(`✅ Sincronización completada: ${sincronizados.length} asistentes sincronizados`)
    
    return NextResponse.json({
      success: true,
      message: 'Sincronización con Google Sheets completada exitosamente',
      estadisticas: {
        totalAsistentes: sincronizados.length,
        enMemoriaAntes: memoryAsistentes.length,
        escarapelasImpresas,
        escarapelasPendientes,
        porcentajeImpresas: sincronizados.length > 0 ? Math.round((escarapelasImpresas / sincronizados.length) * 100) : 0
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
    const asistentes = db.getAsistentes()
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