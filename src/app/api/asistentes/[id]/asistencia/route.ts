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
    
    // 1. ACTUALIZAR EN MEMORIA LOCAL PRIMERO (esto marca como no sincronizado)
    const asistenteActualizado = db.updateAsistenteById(id, {
      presente: true,
      horaLlegada: new Date().toISOString()
    })
    
    if (!asistenteActualizado) {
      console.log('❌ Error actualizando asistente en memoria')
      return NextResponse.json(
        { 
          success: false,
          error: 'Error actualizando asistente' 
        },
        { status: 500 }
      )
    }

    console.log('✅ Asistente actualizado en memoria (pendiente sincronización):', asistenteActualizado.nombre)

    // 2. SINCRONIZACIÓN INMEDIATA CON GOOGLE SHEETS (SIN BATCHING)
    let syncSuccess = false
    if (googleSheetsService.isConfigured()) {
      try {
        console.log('🌐 Sincronizando inmediatamente con Google Sheets:', asistenteActualizado.nombre)
        
        // USAR SINCRONIZACIÓN INMEDIATA SIN BATCHING
        syncSuccess = await googleSheetsService.updateAsistente(asistenteActualizado)
        
        if (syncSuccess) {
          db.markAsSynced(id)
          console.log('📊 ✅ Asistencia sincronizada inmediatamente con Google Sheets:', asistenteActualizado.nombre)
        } else {
          console.log('❌ Error sincronizando con Google Sheets')
          return NextResponse.json(
            { 
              success: false,
              error: 'Error sincronizando con Google Sheets' 
            },
            { status: 500 }
          )
        }
      } catch (error) {
        console.error('❌ Error sincronizando asistencia con Google Sheets:', error)
        return NextResponse.json(
          { 
            success: false,
            error: 'Error sincronizando con Google Sheets',
            details: error instanceof Error ? error.message : 'Error desconocido'
          },
          { status: 500 }
        )
      }
    } else {
      console.log('❌ Google Sheets no configurado')
      return NextResponse.json(
        { 
          success: false,
          error: 'Google Sheets no configurado' 
        },
        { status: 500 }
      )
    }

    // 4. NOTIFICAR A OTROS CLIENTES VÍA SOCKET.IO (no bloquear respuesta)
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'asistencia-marcada',
          data: { 
            asistente: asistenteActualizado,
            device: 'Manual',
            sincronizado: syncSuccess
          }
        })
      })
    } catch (error) {
      console.error('⚠️ Error notificando via socket (no crítico):', error)
    }

    // 5. RESPUESTA EXITOSA SOLO SI SE SINCRONIZÓ CORRECTAMENTE
    const respuesta = {
      success: true,
      asistente: asistenteActualizado,
      message: `${asistenteActualizado.nombre} marcado como presente y sincronizado con Google Sheets`,
      sincronizado: true
    }

    return NextResponse.json(respuesta)
    
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