import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db, { type Asistente } from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

// Sincronización con Google Sheets
async function sincronizarConGoogleSheets(asistente: Asistente) {
  try {
    if (googleSheetsService.isConfigured()) {
      await googleSheetsService.addAsistente(asistente)
      console.log('Asistente sincronizado con Google Sheets:', asistente.nombre)
    } else {
      console.log('Google Sheets no configurado, solo guardando en memoria')
    }
  } catch (error) {
    console.error('Error sincronizando con Google Sheets:', error)
  }
}

export async function GET() {
  try {
    // En Vercel (serverless), priorizar Google Sheets como fuente de verdad
    if (googleSheetsService.isConfigured()) {
      try {
        console.log('🔄 Cargando asistentes desde Google Sheets (modo serverless)')
        
        // Leer directamente desde Google Sheets
        const sheetsAsistentes = await googleSheetsService.getAsistentes()
        
        // Actualizar memoria local para esta ejecución lambda
        sheetsAsistentes.forEach(asistente => {
          const existing = db.findAsistenteById(asistente.id)
          if (!existing) {
            db.addAsistente(asistente)
          } else {
            db.updateAsistente(asistente.id, asistente)
          }
        })
        
        console.log(`✅ ${sheetsAsistentes.length} asistentes cargados desde Google Sheets`)
        return NextResponse.json(sheetsAsistentes)
        
      } catch (sheetsError) {
        console.error('❌ Error cargando desde Google Sheets:', sheetsError)
        
        // Fallback a memoria local (probablemente vacía en serverless)
        const memoryAsistentes = db.getAsistentes()
        console.log(`⚠️ Fallback: ${memoryAsistentes.length} asistentes en memoria local`)
        
        return NextResponse.json({
          asistentes: memoryAsistentes,
          warning: 'Google Sheets no disponible, datos limitados',
          error: sheetsError instanceof Error ? sheetsError.message : 'Error de conexión'
        })
      }
    }
    
    // Si Google Sheets no está configurado
    const asistentes = db.getAsistentes()
    console.log(`📝 Solo memoria local: ${asistentes.length} asistentes`)
    
    return NextResponse.json({
      asistentes,
      warning: 'Google Sheets no configurado - solo datos locales'
    })
    
  } catch (error) {
    console.error('❌ Error general:', error)
    return NextResponse.json(
      { error: 'Error obteniendo asistentes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const nuevoAsistente: Asistente = {
      id: uuidv4(),
      nombre: body.nombre,
      email: body.email || '',
      cargo: body.cargo || '',
      empresa: body.empresa || '',
      presente: false,
      escarapelaImpresa: false,
      fechaRegistro: new Date().toISOString(),
      horaLlegada: undefined
    }

    db.addAsistente(nuevoAsistente)
    
    // Sincronizar con Google Sheets
    await sincronizarConGoogleSheets(nuevoAsistente)
    
    // Notificar a otros clientes vía Socket.io
    await fetch('/api/socket.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'nuevo-asistente',
        data: nuevoAsistente
      })
    })

    return NextResponse.json(nuevoAsistente, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creando asistente' },
      { status: 500 }
    )
  }
} 