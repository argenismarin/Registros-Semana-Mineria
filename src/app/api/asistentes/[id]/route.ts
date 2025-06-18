import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'

// GET /api/asistentes/[id] - Obtener un asistente específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const asistente = db.findAsistenteById(id)
    
    if (!asistente) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(asistente)
  } catch (error) {
    console.error('Error obteniendo asistente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/asistentes/[id] - Actualizar un asistente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const datosActualizacion = await request.json()

    // Validación básica
    if (!datosActualizacion.nombre || datosActualizacion.nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      )
    }

    // Actualizar asistente
    const asistenteActualizado = db.updateAsistente(id, datosActualizacion)
    
    if (!asistenteActualizado) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      )
    }

    // Notificar a través de Socket.io
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'asistente-actualizado',
          data: asistenteActualizado
        })
      })
    } catch (socketError) {
      console.error('Error notificando actualización:', socketError)
    }

    return NextResponse.json({
      success: true,
      asistente: asistenteActualizado,
      mensaje: 'Asistente actualizado correctamente'
    })

  } catch (error) {
    console.error('Error actualizando asistente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/asistentes/[id] - Eliminar un asistente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Obtener datos del asistente antes de eliminarlo
    const asistente = db.findAsistenteById(id)
    if (!asistente) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar asistente
    const eliminado = db.deleteAsistente(id)
    
    if (!eliminado) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el asistente' },
        { status: 500 }
      )
    }

    // Notificar a través de Socket.io
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'asistente-eliminado',
          data: { id, nombre: asistente.nombre }
        })
      })
    } catch (socketError) {
      console.error('Error notificando eliminación:', socketError)
    }

    return NextResponse.json({
      success: true,
      mensaje: `Asistente ${asistente.nombre} eliminado correctamente`
    })

  } catch (error) {
    console.error('Error eliminando asistente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 