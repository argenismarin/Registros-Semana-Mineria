import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

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

    // 1. ACTUALIZAR EN MEMORIA LOCAL PRIMERO
    const asistenteActualizado = db.updateAsistenteById(id, datosActualizacion)
    
    if (!asistenteActualizado) {
      return NextResponse.json(
        { error: 'Asistente no encontrado' },
        { status: 404 }
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
          // 3. Se agregó al lote exitosamente (se sincronizará realmente después)
          console.log('📦 ✅ Cambios agregados al lote para sincronización:', asistenteActualizado.nombre)
        } else {
          console.log('📊 ⚠️ Error agregando al lote - intentando sincronización inmediata')
          // Fallback: sincronización inmediata si el batch falla
          syncSuccess = await googleSheetsService.updateAsistenteOptimized(asistenteActualizado, false)
          if (syncSuccess) {
            db.markAsSynced(id)
            console.log('📊 ✅ Cambios sincronizados inmediatamente:', asistenteActualizado.nombre)
          } else {
            console.log('📊 ⚠️ Error sincronizando - cambio mantenido en memoria local')
          }
        }
      } catch (error) {
        console.error('⚠️ Error sincronizando edición con Google Sheets:', error)
        syncSuccess = false
        // NO fallar la respuesta - el cambio se mantiene en memoria local
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, cambios solo en memoria local')
    }

    // 4. NOTIFICAR A TRAVÉS DE SOCKET.IO
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'asistente-actualizado',
          data: {
            asistente: asistenteActualizado,
            sincronizado: syncSuccess
          }
        })
      })
    } catch (socketError) {
      console.error('Error notificando actualización:', socketError)
    }

    // 5. RESPUESTA SIEMPRE EXITOSA SI SE GUARDÓ EN MEMORIA
    const respuesta = {
      success: true,
      asistente: asistenteActualizado,
      mensaje: 'Asistente actualizado correctamente',
      sincronizado: syncSuccess,
      pendientesSync: db.hasPendingChanges() ? db.getPendingSyncAsistentes().length : 0
    }

    if (!syncSuccess && googleSheetsService.isConfigured()) {
      respuesta.mensaje += ' (sincronización pendiente)'
    }

    return NextResponse.json(respuesta)

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

    // Eliminar asistente de memoria local
    const eliminado = db.deleteAsistente(id)
    
    if (!eliminado) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el asistente' },
        { status: 500 }
      )
    }

    console.log('✅ Asistente eliminado de memoria:', asistente.nombre)

    // 🆕 ELIMINAR DE GOOGLE SHEETS
    if (googleSheetsService.isConfigured()) {
      try {
        const deleteSuccess = await googleSheetsService.deleteAsistente(id)
        if (deleteSuccess) {
          console.log('📊 ✅ Eliminación sincronizada con Google Sheets:', asistente.nombre)
        } else {
          console.log('📊 ⚠️ Error eliminando de Google Sheets - continuando')
        }
      } catch (error) {
        console.error('⚠️ Error sincronizando eliminación con Google Sheets:', error)
        // No fallar la respuesta por esto, pero logearlo
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, eliminación solo en memoria local')
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