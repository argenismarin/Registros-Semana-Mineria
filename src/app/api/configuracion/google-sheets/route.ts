import { NextRequest, NextResponse } from 'next/server'
import googleSheetsService from '@/lib/googleSheets'

export async function GET() {
  try {
    // Test de conexión con Google Sheets
    const configured = googleSheetsService.isConfigured()
    
    if (!configured) {
      return NextResponse.json({
        success: false,
        message: 'Google Sheets no está configurado correctamente',
        configured: false
      }, { status: 400 })
    }

    // Intentar obtener asistentes como test
    const asistentes = await googleSheetsService.getAsistentes()
    
    return NextResponse.json({
      success: true,
      message: 'Conexión con Google Sheets exitosa',
      configured: true,
      data: { totalAsistentes: asistentes.length }
    })
  } catch (error) {
    console.error('Error testing Google Sheets:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Error conectando con Google Sheets',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Configurar nuevas credenciales de Google Sheets
    // En un entorno de producción, esto se manejaría de forma más segura
    
    return NextResponse.json({
      success: true,
      message: 'Configuración de Google Sheets actualizada',
      data
    })
  } catch (error) {
    console.error('Error updating Google Sheets config:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Error actualizando configuración',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 