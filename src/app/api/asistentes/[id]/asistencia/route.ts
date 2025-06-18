import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Marcar como presente y registrar hora de llegada
    const asistenteActualizado = db.updateAsistente(id, {
      presente: true,
      horaLlegada: new Date().toISOString()
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
        event: 'asistencia-marcada',
        data: { 
          asistente: asistenteActualizado,
          device: 'Manual'
        }
      })
    })

    return NextResponse.json(asistenteActualizado)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error marcando asistencia' },
      { status: 500 }
    )
  }
} 