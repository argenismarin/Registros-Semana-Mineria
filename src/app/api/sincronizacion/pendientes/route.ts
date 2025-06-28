import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

// GET - Obtener información de sincronización pendiente
export async function GET() {
  try {
    const stats = db.getSyncStats()
    const pendientes = db.getPendingSyncAsistentes()
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        modoOffline: true,
        mensaje: 'Modo OFFLINE-FIRST: Sincronización solo manual'
      },
      pendientes: pendientes.map(p => ({
        id: p.id,
        nombre: p.nombre,
        presente: p.presente,
        escarapelaImpresa: p.escarapelaImpresa
      }))
    })
  } catch (error: any) {
    console.error('❌ Error obteniendo pendientes:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST - Sincronizar cambios pendientes MANUALMENTE
export async function POST(req: NextRequest) {
  try {
    const pendientes = db.getPendingSyncAsistentes()
    
    if (pendientes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay cambios pendientes para sincronizar',
        sincronizados: 0,
        fallidos: []
      })
    }

    console.log(`🔄 SINCRONIZACIÓN MANUAL: ${pendientes.length} cambios pendientes`)
    
    const resultados = {
      sincronizados: 0,
      fallidos: [] as string[]
    }

    // Procesar LENTAMENTE para evitar rate limiting
    // Procesar UNO POR UNO con delays de 10 segundos entre cada uno
    for (let i = 0; i < pendientes.length; i++) {
      const asistente = pendientes[i]
      
      try {
        console.log(`📤 Sincronizando ${i + 1}/${pendientes.length}: ${asistente.nombre}`)
        
        // Intentar sincronizar (usa el sistema de batching interno)
        const success = await googleSheetsService.updateAsistenteOptimized(asistente, false) // Sin batch, individual
        
        if (success) {
          db.markAsSynced(asistente.id)
          resultados.sincronizados++
          console.log(`✅ Sincronizado: ${asistente.nombre}`)
        } else {
          resultados.fallidos.push(asistente.nombre)
          console.log(`❌ Falló sincronización: ${asistente.nombre}`)
        }
        
        // DELAY ULTRA CONSERVADOR entre cada sincronización
        if (i < pendientes.length - 1) { // No delay después del último
          console.log(`⏳ Esperando 12 segundos antes del siguiente...`)
          await new Promise(resolve => setTimeout(resolve, 12000)) // 12 segundos
        }
        
      } catch (error: any) {
        console.error(`❌ Error sincronizando ${asistente.nombre}:`, error)
        resultados.fallidos.push(asistente.nombre)
        
        // En caso de error 429, esperar aún más
        if (error.status === 429 || error.code === 429) {
          console.log(`🚨 Rate limit detectado, esperando 30 segundos...`)
          await new Promise(resolve => setTimeout(resolve, 30000)) // 30 segundos
        }
      }
    }

    // Forzar flush de cualquier batch pendiente
    try {
      await googleSheetsService.flushBatch()
    } catch (error) {
      console.error('Error en flush batch:', error)
    }

    const mensaje = `Sincronización completada: ${resultados.sincronizados} exitosos, ${resultados.fallidos.length} fallidos`
    console.log(`📊 ${mensaje}`)

    return NextResponse.json({
      success: true,
      message: mensaje,
      sincronizados: resultados.sincronizados,
      fallidos: resultados.fallidos,
      detalles: {
        totalProcesados: pendientes.length,
        tiempoEstimado: `${Math.round(pendientes.length * 12)}s`
      }
    })

  } catch (error: any) {
    console.error('❌ Error en sincronización manual:', error)
    return NextResponse.json({
      success: false,
      error: `Error sincronizando: ${error.message}`,
      sincronizados: 0,
      fallidos: []
    }, { status: 500 })
  }
}

// DELETE - Limpiar cola de pendientes (uso administrativo)
export async function DELETE() {
  try {
    const stats = db.getSyncStats()
    const pendientesBorrados = stats.pendientes
    
    // Marcar todos como sincronizados (limpieza administrativa)
    const pendientes = db.getPendingSyncAsistentes()
    pendientes.forEach(asistente => {
      db.markAsSynced(asistente.id)
    })
    
    console.log(`🧹 Cola de pendientes limpiada: ${pendientesBorrados} elementos`)
    
    return NextResponse.json({
      success: true,
      message: `Cola limpiada: ${pendientesBorrados} pendientes marcados como sincronizados`,
      pendientesBorrados
    })
  } catch (error: any) {
    console.error('❌ Error limpiando cola:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 