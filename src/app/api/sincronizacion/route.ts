import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronización completa con Google Sheets...')

    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Google Sheets no configurado',
          message: 'Las variables de entorno de Google Sheets no están configuradas'
        },
        { status: 400 }
      )
    }

    // Obtener asistentes de memoria local
    const memoryAsistentes = db.getAllAsistentes()
    console.log(`📊 Asistentes en memoria: ${memoryAsistentes.length}`)

    // Sincronizar con Google Sheets
    const sincronizados = await googleSheetsService.syncWithMemoryDatabase(memoryAsistentes)
    console.log(`✅ Asistentes sincronizados: ${sincronizados.length}`)

    // Actualizar memoria local con datos sincronizados
    sincronizados.forEach(asistente => {
      db.updateAsistente(asistente.id, asistente)
    })

    // Obtener estadísticas
    const estadisticas = {
      totalAsistentes: sincronizados.length,
      presentes: sincronizados.filter(a => a.presente).length,
      pendientes: sincronizados.filter(a => !a.presente).length,
      escarapelasImpresas: sincronizados.filter(a => a.escarapelaImpresa).length
    }

    // Notificar a clientes conectados
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'sincronizacion-completada',
          data: {
            mensaje: 'Datos sincronizados con Google Sheets',
            estadisticas
          }
        })
      })
    } catch (error) {
      console.error('⚠️ Error notificando sincronización (no crítico):', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada exitosamente',
      estadisticas,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en sincronización:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error durante la sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Consultando estado de sincronización...')

    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Google Sheets no configurado'
      })
    }

    // Obtener datos básicos
    const memoryAsistentes = db.getAllAsistentes()
    const sheetsAsistentes = await googleSheetsService.getAsistentes()

    const estadisticas = {
      memoria: {
        total: memoryAsistentes.length,
        presentes: memoryAsistentes.filter(a => a.presente).length,
        ultimaActualizacion: memoryAsistentes.length > 0 
          ? Math.max(...memoryAsistentes.map(a => new Date(a.fechaRegistro).getTime()))
          : null
      },
      sheets: {
        total: sheetsAsistentes.length,
        presentes: sheetsAsistentes.filter(a => a.presente).length,
        ultimaActualizacion: sheetsAsistentes.length > 0
          ? Math.max(...sheetsAsistentes.map(a => new Date(a.fechaRegistro).getTime()))
          : null
      }
    }

    return NextResponse.json({
      configured: true,
      estadisticas,
      sincronizacionRequerida: estadisticas.memoria.total !== estadisticas.sheets.total ||
                              estadisticas.memoria.presentes !== estadisticas.sheets.presentes
    })

  } catch (error) {
    console.error('❌ Error consultando estado:', error)
    return NextResponse.json(
      { 
        error: 'Error consultando estado de sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 