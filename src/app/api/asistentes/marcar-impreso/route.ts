import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const { asistentesIds }: { asistentesIds: string[] } = await request.json()

    if (!asistentesIds || asistentesIds.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron IDs de asistentes' }, { status: 400 })
    }

    console.log(`🖨️ Marcando ${asistentesIds.length} escarapelas como impresas...`)

    let asistentesActualizados = 0
    const resultados: string[] = []
    const fechaImpresion = new Date().toISOString()

    // Paso 1: Marcar como impreso en la base de datos local
    for (const id of asistentesIds) {
      const asistenteActualizado = db.marcarEscarapelaImpresa(id)
      if (asistenteActualizado) {
        asistentesActualizados++
        resultados.push(asistenteActualizado.nombre)
      }
    }

    // Paso 2: Sincronizar con Google Sheets (en paralelo)
    let sheetsResult = { success: 0, failed: [] as string[] }
    
    if (googleSheetsService.isConfigured()) {
      try {
        console.log('🔄 Sincronizando con Google Sheets...')
        sheetsResult = await googleSheetsService.updateMultipleEscarapelasStatus(asistentesIds, true)
        console.log(`✅ Google Sheets actualizado: ${sheetsResult.success} exitosos, ${sheetsResult.failed.length} fallidos`)
      } catch (sheetsError) {
        console.warn('⚠️ Error sincronizando con Google Sheets:', sheetsError)
        // No fallar la operación completa por errores de Sheets
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, saltando sincronización')
    }

    return NextResponse.json({
      success: true,
      message: `${asistentesActualizados} escarapelas marcadas como impresas`,
      asistentesActualizados,
      asistentesProcesados: resultados,
      fechaImpresion,
      googleSheets: {
        configurado: googleSheetsService.isConfigured(),
        actualizados: sheetsResult.success,
        errores: sheetsResult.failed.length,
        fallidos: sheetsResult.failed
      }
    })

  } catch (error) {
    console.error('Error marcando escarapelas como impresas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 