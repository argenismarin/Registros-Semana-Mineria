import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

// GET /api/sincronizacion/pendientes - Obtener información de cambios pendientes
export async function GET(request: NextRequest) {
  try {
    const stats = db.getSyncStats()
    const pendientes = db.getPendingSyncAsistentes()

    return NextResponse.json({
      stats,
      pendientes: pendientes.map(a => ({
        id: a.id,
        nombre: a.nombre,
        ultimaModificacion: a.ultimaModificacion,
        presente: a.presente,
        escarapelaImpresa: a.escarapelaImpresa
      }))
    })
  } catch (error) {
    console.error('Error obteniendo pendientes:', error)
    return NextResponse.json(
      { error: 'Error obteniendo información de sincronización' },
      { status: 500 }
    )
  }
}

// POST /api/sincronizacion/pendientes - Sincronizar todos los cambios pendientes DE FORMA OPTIMIZADA
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronización OPTIMIZADA de cambios pendientes...')
    
    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json(
        { error: 'Google Sheets no está configurado' },
        { status: 400 }
      )
    }

    const pendientes = db.getPendingSyncAsistentes()
    
    if (pendientes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay cambios pendientes para sincronizar',
        resultados: {
          total: 0,
          exitosos: 0,
          fallidos: 0,
          errores: []
        }
      })
    }

    console.log(`📦 Sincronizando ${pendientes.length} cambios pendientes usando BATCH OPTIMIZADO...`)
    
    const resultados = {
      total: pendientes.length,
      exitosos: 0,
      fallidos: 0,
      errores: [] as string[],
      metodo: 'optimized-batch'
    }

    try {
      // USAR MÉTODO OPTIMIZADO CON BATCHING AUTÁTICO
      for (const asistente of pendientes) {
        try {
          // Agregar al batch - se procesará automáticamente
          const success = await googleSheetsService.updateAsistenteOptimized(asistente, true)
          
          if (success) {
            // Marcar como sincronizado inmediatamente en memoria local
            // (el batch real se procesará en background)
            db.markAsSynced(asistente.id)
            resultados.exitosos++
            console.log(`📦 ✅ Agregado al batch: ${asistente.nombre}`)
          } else {
            resultados.fallidos++
            resultados.errores.push(`Error agregando ${asistente.nombre} al batch`)
          }
        } catch (error) {
          resultados.fallidos++
          const errorMsg = `Error procesando ${asistente.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`
          resultados.errores.push(errorMsg)
          console.error('❌', errorMsg)
        }
      }

      // FORZAR PROCESAMIENTO INMEDIATO DEL BATCH PARA RESPUESTA RÁPIDA
      console.log('🚀 Forzando procesamiento inmediato del batch...')
      await googleSheetsService.flushBatch()
      
      console.log(`✅ Sincronización optimizada completada: ${resultados.exitosos}/${resultados.total} exitosos`)

    } catch (batchError) {
      console.error('❌ Error en sincronización batch:', batchError)
      
      // FALLBACK: Procesar uno por uno si el batch falla completamente
      console.log('🔄 Fallback: procesando uno por uno...')
      resultados.metodo = 'fallback-individual'
      
      for (const asistente of pendientes) {
        try {
          const success = await googleSheetsService.updateAsistenteOptimized(asistente, false)
          if (success) {
            db.markAsSynced(asistente.id)
            resultados.exitosos++
          } else {
            resultados.fallidos++
            resultados.errores.push(`Fallback: Error sincronizando ${asistente.nombre}`)
          }
        } catch (error) {
          resultados.fallidos++
          resultados.errores.push(`Fallback: Error ${asistente.nombre}: ${error instanceof Error ? error.message : 'Desconocido'}`)
        }
      }
    }

    // Notificar a otros clientes si hubo cambios exitosos
    if (resultados.exitosos > 0) {
      try {
        await fetch(`${request.nextUrl.origin}/api/socket.io`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'sincronizacion-optimizada-completada',
            data: {
              exitosos: resultados.exitosos,
              fallidos: resultados.fallidos,
              metodo: resultados.metodo,
              timestamp: new Date().toISOString()
            }
          })
        })
      } catch (socketError) {
        console.error('Error notificando sincronización:', socketError)
      }
    }

    const response = {
      success: true,
      message: `Sincronización optimizada completada: ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos (${resultados.metodo})`,
      resultados,
      pendientesRestantes: db.getPendingSyncAsistentes().length,
      batchStats: googleSheetsService.getBatchStats()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error en sincronización optimizada de pendientes:', error)
    return NextResponse.json(
      { 
        error: 'Error en sincronización optimizada de cambios pendientes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/sincronizacion/pendientes - Limpiar cola de sincronización (usar con cuidado)
export async function DELETE(request: NextRequest) {
  try {
    const pendientesAntes = db.getPendingSyncAsistentes().length
    db.clearSyncQueue()
    
    console.log(`🧹 Cola de sincronización limpiada: ${pendientesAntes} elementos eliminados`)
    
    return NextResponse.json({
      success: true,
      message: `Cola de sincronización limpiada: ${pendientesAntes} elementos eliminados`,
      pendientesEliminados: pendientesAntes
    })
    
  } catch (error) {
    console.error('Error limpiando cola de sincronización:', error)
    return NextResponse.json(
      { error: 'Error limpiando cola de sincronización' },
      { status: 500 }
    )
  }
} 