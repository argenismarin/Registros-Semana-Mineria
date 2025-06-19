import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    console.log('🖨️ POST /api/asistentes/[id]/imprimir - Marcando escarapela como impresa para:', id)
    
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
    
    // Marcar escarapela como impresa
    const asistenteActualizado = db.updateAsistente(id, {
      escarapelaImpresa: true,
      fechaImpresion: new Date().toISOString()
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

    console.log('✅ Escarapela marcada como impresa:', asistenteActualizado)

    // 🆕 SINCRONIZAR CON GOOGLE SHEETS
    if (googleSheetsService.isConfigured()) {
      try {
        await googleSheetsService.updateAsistente(asistenteActualizado)
        console.log('📊 Impresión sincronizada con Google Sheets:', asistenteActualizado.nombre)
      } catch (error) {
        console.error('⚠️ Error sincronizando impresión con Google Sheets:', error)
        // No fallar la respuesta por esto, pero logearlo
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, impresión solo en memoria local')
    }

    // Notificar a otros clientes vía Socket.io (no bloquear respuesta)
    fetch('/api/socket.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'escarapela-impresa',
        data: asistenteActualizado
      })
    }).catch(error => {
      console.error('⚠️ Error notificando via socket (no crítico):', error)
    })

    return NextResponse.json({
      success: true,
      asistente: asistenteActualizado,
      message: `Escarapela de ${asistenteActualizado.nombre} marcada como impresa`
    })
    
  } catch (error) {
    console.error('❌ Error marcando escarapela como impresa:', error)
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