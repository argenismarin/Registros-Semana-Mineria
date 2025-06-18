import { NextResponse } from 'next/server'
import googleSheetsService from '@/lib/googleSheets'

export async function POST() {
  try {
    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets no está configurado'
      })
    }

    // Intentar leer datos para probar la conexión
    const asistentes = await googleSheetsService.getAsistentes()
    
    return NextResponse.json({
      success: true,
      message: `Conexión exitosa. Se encontraron ${asistentes.length} asistentes.`,
      asistenteCount: asistentes.length
    })
  } catch (error) {
    console.error('Error probando Google Sheets:', error)
    
    let errorMessage = 'Error desconocido'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    })
  }
} 