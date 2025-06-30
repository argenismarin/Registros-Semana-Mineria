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

    // 2. SINCRONIZACIÓN INMEDIATA CON GOOGLE SHEETS (SIN BATCHING)
    let syncSuccess = false
    if (googleSheetsService.isConfigured()) {
      try {
        console.log('🌐 Sincronizando inmediatamente con Google Sheets:', asistenteActualizado.nombre)
        
        // USAR SINCRONIZACIÓN INMEDIATA SIN BATCHING
        syncSuccess = await googleSheetsService.updateAsistente(asistenteActualizado)
        
        if (syncSuccess) {
          db.markAsSynced(id)
          console.log('📊 ✅ Cambios sincronizados inmediatamente con Google Sheets:', asistenteActualizado.nombre)
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
        console.error('❌ Error sincronizando edición con Google Sheets:', error)
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

    // 5. RESPUESTA EXITOSA SOLO SI SE SINCRONIZÓ CORRECTAMENTE
    const respuesta = {
      success: true,
      asistente: asistenteActualizado,
      mensaje: 'Asistente actualizado y sincronizado con Google Sheets',
      sincronizado: true
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