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

    // 2. SINCRONIZAR CON GOOGLE SHEETS DE FORMA OPTIMIZADA (USANDO BATCH)
    let syncSuccess = false
    if (googleSheetsService.isConfigured()) {
      try {
        // Usar método optimizado con batching - se procesa automáticamente en lotes
        syncSuccess = await googleSheetsService.updateAsistenteOptimized(asistenteActualizado, true)
        
        if (syncSuccess) {
          // 3. MARCAR COMO SINCRONIZADO (el batching lo sincronizará realmente después)
          console.log('📦 ✅ Asistencia agregada al lote para sincronización:', asistenteActualizado.nombre)
        } else {
          console.log('📊 ⚠️ Error agregando al lote - intentando sincronización inmediata')
          // Fallback: sincronización inmediata si el batch falla
          syncSuccess = await googleSheetsService.updateAsistenteOptimized(asistenteActualizado, false)
          if (syncSuccess) {
            db.markAsSynced(id)
            console.log('📊 ✅ Asistencia sincronizada inmediatamente:', asistenteActualizado.nombre)
          }
        }
      } catch (error) {
        console.error('⚠️ Error sincronizando asistencia con Google Sheets:', error)
        syncSuccess = false
        // NO retornar error aquí - el cambio se mantiene en memoria local para sincronización posterior
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, asistencia solo en memoria local')
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

    // 5. RESPUESTA SIEMPRE EXITOSA SI SE GUARDÓ EN MEMORIA
    const respuesta = {
      success: true,
      asistente: asistenteActualizado,
      message: `${asistenteActualizado.nombre} marcado como presente`,
      sincronizado: syncSuccess,
      pendientesSync: db.hasPendingChanges() ? db.getPendingSyncAsistentes().length : 0
    }

    if (!syncSuccess && googleSheetsService.isConfigured()) {
      respuesta.message += ' (sincronización pendiente)'
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