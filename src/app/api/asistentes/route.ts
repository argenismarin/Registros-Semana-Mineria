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
    // Intentar sincronizar con Google Sheets primero
    if (googleSheetsService.isConfigured()) {
      try {
        const memoryAsistentes = db.getAsistentes()
        const syncedAsistentes = await googleSheetsService.syncWithMemoryDatabase(memoryAsistentes)
        
        // Actualizar base de datos en memoria con datos sincronizados
        syncedAsistentes.forEach(asistente => {
          const existing = db.findAsistenteById(asistente.id)
          if (!existing) {
            db.addAsistente(asistente)
          } else {
            db.updateAsistente(asistente.id, asistente)
          }
        })
        
        return NextResponse.json(syncedAsistentes)
      } catch (sheetsError) {
        console.error('Error sincronizando con Google Sheets:', sheetsError)
        // Fallback a datos en memoria
      }
    }
    
    const asistentes = db.getAsistentes()
    return NextResponse.json(asistentes)
  } catch (error) {
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