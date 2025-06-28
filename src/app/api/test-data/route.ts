import { NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function GET() {
  try {
    console.log('🔍 Diagnóstico de datos - iniciando...')
    
    // Datos en memoria
    const memoryData = db.getAsistentes()
    console.log(`💾 Memoria: ${memoryData.length} asistentes`)
    
    let sheetsData: any[] = []
    let sheetsError: string | null = null
    
    // Datos en Google Sheets
    if (googleSheetsService.isConfigured()) {
      try {
        sheetsData = await googleSheetsService.getAsistentes()
        console.log(`📊 Google Sheets: ${sheetsData.length} asistentes`)
      } catch (error) {
        sheetsError = error instanceof Error ? error.message : 'Error desconocido'
        console.error('❌ Error leyendo Google Sheets:', error)
      }
    } else {
      sheetsError = 'Google Sheets no configurado'
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      memoria: {
        cantidad: memoryData.length,
        asistentes: memoryData.map(a => ({
          id: a.id,
          nombre: a.nombre,
          presente: a.presente,
          escarapelaImpresa: a.escarapelaImpresa
        }))
      },
      googleSheets: {
        configurado: googleSheetsService.isConfigured(),
        cantidad: sheetsData.length,
        error: sheetsError,
        asistentes: sheetsData.map((a: any) => ({
          id: a.id,
          nombre: a.nombre,
          presente: a.presente,
          escarapelaImpresa: a.escarapelaImpresa
        }))
      },
      diagnostico: {
        memoriaVacia: memoryData.length === 0,
        sheetsVacio: sheetsData.length === 0,
        tieneConfiguracion: googleSheetsService.isConfigured(),
        hayErrorConexion: sheetsError !== null
      }
    })
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json(
      { 
        error: 'Error en diagnóstico',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 