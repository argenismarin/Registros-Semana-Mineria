import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { asistentesIds }: { asistentesIds: string[] } = await request.json()

    if (!asistentesIds || !Array.isArray(asistentesIds)) {
      return NextResponse.json(
        { error: 'Lista de IDs de asistentes requerida' },
        { status: 400 }
      )
    }

    let actualizados = 0
    let errores = 0

    // Marcar cada asistente como QR generado
    asistentesIds.forEach(id => {
      try {
        const asistente = db.updateAsistente(id, {
          qrGenerado: true,
          fechaGeneracionQR: new Date().toISOString()
        })
        
        if (asistente) {
          actualizados++
        } else {
          errores++
        }
      } catch (error) {
        errores++
        console.error(`Error actualizando asistente ${id}:`, error)
      }
    })

    // Notificar cambios via Socket.io
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'qr-masivo-generado',
          data: {
            cantidad: actualizados,
            mensaje: `QR generados masivamente para ${actualizados} asistentes`
          }
        })
      })
    } catch (error) {
      console.error('Error notificando QR masivo:', error)
    }

    return NextResponse.json({
      success: true,
      actualizados,
      errores,
      mensaje: `${actualizados} asistentes marcados como QR generado`
    })

  } catch (error) {
    console.error('Error marcando QRs como generados:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 