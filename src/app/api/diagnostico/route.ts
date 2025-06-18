import { NextResponse } from 'next/server'
import googleSheetsService from '@/lib/googleSheets'
import db from '@/lib/database'

export async function GET() {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    googleSheets: {
      configured: false,
      canConnect: false,
      totalAsistentes: 0,
      error: null as string | null
    },
    memory: {
      totalAsistentes: 0
    }
  }

  // Verificar memoria local
  try {
    const memoryAsistentes = db.getAsistentes()
    diagnostico.memory.totalAsistentes = memoryAsistentes.length
  } catch (error) {
    console.error('Error checking memory:', error)
  }

  // Verificar Google Sheets
  try {
    diagnostico.googleSheets.configured = googleSheetsService.isConfigured()
    
    if (diagnostico.googleSheets.configured) {
      const sheetsAsistentes = await googleSheetsService.getAsistentes()
      diagnostico.googleSheets.canConnect = true
      diagnostico.googleSheets.totalAsistentes = sheetsAsistentes.length
    }
  } catch (error) {
    diagnostico.googleSheets.error = error instanceof Error ? error.message : 'Error desconocido'
  }

  return NextResponse.json(diagnostico)
}

export async function POST() {
  try {
    // Forzar sincronización: leer de Google Sheets y actualizar memoria
    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Google Sheets no está configurado'
      })
    }

    const sheetsAsistentes = await googleSheetsService.getAsistentes()
    
    // Limpiar y recargar memoria
    const memoryAsistentes = db.getAsistentes()
    console.log(`🔄 Sincronización forzada: ${sheetsAsistentes.length} desde Sheets, ${memoryAsistentes.length} en memoria`)

    // Actualizar memoria con datos de Sheets
    sheetsAsistentes.forEach(asistente => {
      const existing = db.findAsistenteById(asistente.id)
      if (!existing) {
        db.addAsistente(asistente)
      } else {
        db.updateAsistente(asistente.id, asistente)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Sincronización forzada completada: ${sheetsAsistentes.length} asistentes`,
      beforeSync: memoryAsistentes.length,
      afterSync: sheetsAsistentes.length
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error en sincronización forzada',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 