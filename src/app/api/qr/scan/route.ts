import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrData } = body

    if (!qrData) {
      return NextResponse.json(
        { error: 'Código QR requerido' },
        { status: 400 }
      )
    }

    // Intentar parsear el código QR
    let asistenteInfo
    try {
      // El QR puede contener JSON con info del asistente
      asistenteInfo = JSON.parse(qrData)
    } catch {
      // Si no es JSON, asumir que es solo el ID del asistente
      asistenteInfo = { id: qrData }
    }

    // Buscar el asistente primero en memoria, luego en Google Sheets
    let asistente = db.findAsistenteById(asistenteInfo.id)
    
    if (!asistente && googleSheetsService.isConfigured()) {
      // Buscar en Google Sheets
      const sheetsAsistente = await googleSheetsService.findAsistenteById(asistenteInfo.id)
      
      if (sheetsAsistente) {
        // Agregar a memoria local para futuras búsquedas
        asistente = sheetsAsistente
        db.addAsistente(asistente)
        console.log('Asistente encontrado en Google Sheets y sincronizado a memoria:', asistente.nombre)
      }
    }
    
    if (!asistente) {
      return NextResponse.json(
        { error: 'Asistente no encontrado con este código QR' },
        { status: 404 }
      )
    }

    // Si ya está presente, no hacer nada
    if (asistente.presente) {
      return NextResponse.json({
        success: true,
        message: `${asistente.nombre} ya estaba marcado como presente`,
        asistente,
        yaPresente: true
      })
    }

    // Marcar como presente
    const asistenteActualizado = db.updateAsistente(asistenteInfo.id, {
      presente: true,
      horaLlegada: new Date().toISOString()
    })

    if (!asistenteActualizado) {
      return NextResponse.json(
        { error: 'Error actualizando asistente' },
        { status: 500 }
      )
    }

    // Sincronizar con Google Sheets
    if (googleSheetsService.isConfigured()) {
      try {
        await googleSheetsService.updateAsistente(asistenteActualizado)
        console.log('Asistencia sincronizada con Google Sheets:', asistenteActualizado.nombre)
      } catch (error) {
        console.error('Error sincronizando asistencia con Google Sheets:', error)
      }
    }

    // Notificar a otros clientes vía Socket.io
    try {
      await fetch('/api/socket.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'qr-escaneado',
          data: { 
            asistente: asistenteActualizado,
            device: 'QR Scanner'
          }
        })
      })
    } catch (error) {
      console.error('Error notificando via socket:', error)
    }

    return NextResponse.json({
      success: true,
      message: `¡${asistenteActualizado.nombre} marcado como presente!`,
      asistente: asistenteActualizado,
      yaPresente: false
    })

  } catch (error) {
    console.error('Error procesando QR:', error)
    return NextResponse.json(
      { error: 'Error procesando código QR' },
      { status: 500 }
    )
  }
} 