import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    console.log('📝 POST /api/asistentes/[id]/asistencia - Marcando asistencia para:', id)
    
    // Buscar el asistente primero
    const asistenteExistente = db.findAsistenteById(id)
    if (!asistenteExistente) {
      console.log('❌ Asistente no encontrado:', id)
      return NextResponse.json(
        { 
          success: false,
          error: 'Asistente no encontrado' 
        },
        { status: 404 }
      )
    }

    console.log('👤 Asistente encontrado:', asistenteExistente.nombre)
    
    // Marcar como presente y registrar hora de llegada
    const asistenteActualizado = db.updateAsistente(id, {
      presente: true,
      horaLlegada: new Date().toISOString()
    })
    
    if (!asistenteActualizado) {
      console.log('❌ Error actualizando asistente')
      return NextResponse.json(
        { 
          success: false,
          error: 'Error actualizando asistente' 
        },
        { status: 500 }
      )
    }

    console.log('✅ Asistente actualizado:', asistenteActualizado)

    // Notificar a otros clientes vía Socket.io (no bloquear respuesta)
    fetch('/api/socket.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'asistencia-marcada',
        data: { 
          asistente: asistenteActualizado,
          device: 'Manual'
        }
      })
    }).catch(error => {
      console.error('⚠️ Error notificando via socket (no crítico):', error)
    })

    return NextResponse.json({
      success: true,
      asistente: asistenteActualizado,
      message: `${asistenteActualizado.nombre} marcado como presente`
    })
    
  } catch (error) {
    console.error('❌ Error marcando asistencia:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 