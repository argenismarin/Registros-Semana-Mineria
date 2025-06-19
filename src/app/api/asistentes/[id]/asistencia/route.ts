import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

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

    // 🆕 SINCRONIZAR CON GOOGLE SHEETS DE FORMA OPTIMIZADA
    if (googleSheetsService.isConfigured()) {
      try {
        // Usar método optimizado para actualizar solo el estado de asistencia
        const syncSuccess = await googleSheetsService.updateAsistenciaStatus(
          id, 
          true, 
          asistenteActualizado.horaLlegada
        )
        
        if (syncSuccess) {
          console.log('📊 ✅ Asistencia sincronizada exitosamente con Google Sheets:', asistenteActualizado.nombre)
        } else {
          console.log('📊 ⚠️ Sincronización parcial - usando método completo como respaldo')
          // Fallback al método completo si el optimizado falla
          await googleSheetsService.updateAsistente(asistenteActualizado)
        }
      } catch (error) {
        console.error('⚠️ Error sincronizando asistencia con Google Sheets:', error)
        // No fallar la respuesta por esto, pero logearlo
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, asistencia solo en memoria local')
    }

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