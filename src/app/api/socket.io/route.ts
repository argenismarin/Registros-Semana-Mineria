import { NextRequest, NextResponse } from 'next/server'

// En entorno serverless como Vercel, Socket.io no funciona de la misma manera
// Implementamos un sistema de eventos básico usando endpoint REST

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Socket.io endpoint - para entorno serverless usar polling',
    status: 'running',
    platform: 'vercel'
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, data } = body

    // Log del evento para debugging
    console.log(`📢 Evento recibido: ${event}`, data)
    
    // En serverless, no podemos mantener conexiones WebSocket persistentes
    // Los eventos se manejan via polling desde el cliente
    
    return NextResponse.json({
      success: true,
      message: `Evento ${event} procesado`,
      platform: 'serverless',
      note: 'En Vercel usar polling para tiempo real'
    })

  } catch (error) {
    console.error('Error procesando evento:', error)
    return NextResponse.json(
      { error: 'Error procesando evento' },
      { status: 500 }
    )
  }
} 