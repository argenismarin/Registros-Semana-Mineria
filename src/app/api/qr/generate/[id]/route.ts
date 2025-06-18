import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import db from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') // 'json' (default) or 'image'
    
    // Buscar el asistente
    const asistente = db.findAsistenteById(id)
    
    if (!asistente) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      )
    }

    // Crear datos para el QR
    const qrData = JSON.stringify({
      id: asistente.id,
      nombre: asistente.nombre,
      evento: 'registro-eventos',
      timestamp: new Date().toISOString()
    })

    // Si se solicita imagen directamente
    if (format === 'image') {
      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        type: 'png',
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      return new NextResponse(qrCodeBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="qr-${asistente.nombre.replace(/\s+/g, '-').toLowerCase()}.png"`
        }
      })
    }

    // Respuesta JSON por defecto
    // Generar el código QR como SVG
    const qrCodeSvg = await QRCode.toString(qrData, {
      type: 'svg',
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Generar también como data URL para envío por email/WhatsApp
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2
    })

    return NextResponse.json({
      success: true,
      asistente: {
        id: asistente.id,
        nombre: asistente.nombre
      },
      qrCode: {
        svg: qrCodeSvg,
        dataUrl: qrCodeDataUrl,
        data: qrData
      }
    })

  } catch (error) {
    console.error('Error generando QR:', error)
    return NextResponse.json(
      { error: 'Error generando código QR' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    const { includeInfo = false } = body
    
    // Buscar el asistente
    const asistente = db.findAsistenteById(id)
    
    if (!asistente) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
      )
    }

    // Crear datos para el QR (opción simple solo con ID o completa con info)
    const qrData = includeInfo ? JSON.stringify({
      id: asistente.id,
      nombre: asistente.nombre,
      email: asistente.email,
      cargo: asistente.cargo,
      empresa: asistente.empresa,
      evento: 'registro-eventos',
      timestamp: new Date().toISOString()
    }) : asistente.id

    // Generar el código QR como imagen
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 512,
      margin: 3,
      color: {
        dark: '#1e40af', // Azul del evento
        light: '#ffffff'
      }
    })

    return NextResponse.json({
      success: true,
      asistente: {
        id: asistente.id,
        nombre: asistente.nombre,
        email: asistente.email
      },
      qrCode: {
        dataUrl: qrCodeDataUrl,
        data: qrData
      }
    })

  } catch (error) {
    console.error('Error generando QR personalizado:', error)
    return NextResponse.json(
      { error: 'Error generando código QR personalizado' },
      { status: 500 }
    )
  }
} 