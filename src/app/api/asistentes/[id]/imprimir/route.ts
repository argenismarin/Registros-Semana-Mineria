import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Marcar escarapela como impresa
    const asistenteActualizado = db.updateAsistente(id, {
      escarapelaImpresa: true,
      fechaImpresion: new Date().toISOString()
    })
    
    if (!asistenteActualizado) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      )
    }

    // Notificar a otros clientes vía Socket.io
    await fetch('/api/socket.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'escarapela-impresa',
        data: asistenteActualizado
      })
    })

    return NextResponse.json(asistenteActualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error marcando escarapela como impresa' },
      { status: 500 }
    )
  }
} 