import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

// GET - Obtener todos los asistentes con cache inteligente
export async function GET(req: NextRequest) {
  try {
    console.log('📥 GET /api/asistentes - Iniciando...')
    
    // Verificar si el cache local es válido
    const stats = db.getSyncStats()
    
    // Si tenemos datos y el cache es válido, usar datos locales
    if (stats.total > 0 && db.isCacheValid()) {
      console.log('📦 Usando cache local válido:', {
        total: stats.total,
        cacheAge: stats.cacheAge,
        pendientes: stats.pendientes
      })
      
      const asistentes = db.getAllAsistentes()
      return NextResponse.json({
        success: true,
        asistentes,
        origen: 'cache',
        stats: {
          ...stats,
          mensaje: `Cache válido (${stats.cacheAge}s de antigüedad)`
        }
      })
    }
    
    // Si no tenemos datos o el cache está expirado, cargar desde Google Sheets
    console.log('🔄 Cache expirado o vacío, cargando desde Google Sheets...')
    
    try {
      db.setLoading(true)
      
      // Cargar desde Google Sheets
      const asistentesSheets = await googleSheetsService.getAsistentes()
      console.log(`📊 Cargados ${asistentesSheets.length} asistentes desde Google Sheets`)
      
      if (asistentesSheets.length > 0) {
        // Reemplazar datos en memoria (preservando cambios locales)
        db.replaceAllAsistentes(asistentesSheets)
        
        const asistentes = db.getAllAsistentes()
        const newStats = db.getSyncStats()
        
        return NextResponse.json({
          success: true,
          asistentes,
          origen: 'sheets',
          stats: {
            ...newStats,
            mensaje: `Datos actualizados desde Google Sheets`
          }
        })
      } else {
        // Si Google Sheets está vacío pero tenemos cache expirado, usar el cache
        if (stats.total > 0) {
          console.log('⚠️ Google Sheets vacío, usando cache expirado como fallback')
          
          const asistentes = db.getAllAsistentes()
          return NextResponse.json({
            success: true,
            asistentes,
            origen: 'cache-fallback',
            stats: {
              ...stats,
              mensaje: `Cache expirado usado como fallback (Google Sheets vacío)`
            }
          })
        }
        
        // Completamente vacío
        return NextResponse.json({
          success: true,
          asistentes: [],
          origen: 'empty',
          stats: {
            total: 0,
            sincronizados: 0,
            pendientes: 0,
            cacheAge: 0,
            cacheValid: false,
            mensaje: 'Sin datos disponibles'
          }
        })
      }
      
    } catch (sheetsError: any) {
      console.error('❌ Error cargando desde Google Sheets:', sheetsError)
      
      // En caso de error (incluyendo 429), usar cache si existe
      if (stats.total > 0) {
        console.log('🛡️ Error en Google Sheets, usando cache como fallback')
        
        const asistentes = db.getAllAsistentes()
        return NextResponse.json({
          success: true,
          asistentes,
          origen: 'cache-error-fallback',
          stats: {
            ...stats,
            mensaje: `Cache usado por error en Google Sheets: ${sheetsError.message}`
          }
        })
      }
      
      // Sin cache disponible, retornar error
      return NextResponse.json({
        success: false,
        error: `Error cargando datos: ${sheetsError.message}`,
        asistentes: [],
        stats: {
          total: 0,
          sincronizados: 0,
          pendientes: 0,
          cacheAge: 0,
          cacheValid: false,
          mensaje: 'Error sin cache disponible'
        }
      }, { status: 500 })
      
    } finally {
      db.setLoading(false)
    }
    
  } catch (error: any) {
    console.error('❌ Error general en GET /api/asistentes:', error)
    
    // Último fallback: intentar retornar cache si existe
    try {
      const stats = db.getSyncStats()
      if (stats.total > 0) {
        const asistentes = db.getAllAsistentes()
        return NextResponse.json({
          success: true,
          asistentes,
          origen: 'cache-emergency',
          stats: {
            ...stats,
            mensaje: `Cache de emergencia por error: ${error.message}`
          }
        })
      }
    } catch (fallbackError) {
      console.error('❌ Error en fallback de emergencia:', fallbackError)
    }
    
    return NextResponse.json({
      success: false,
      error: `Error interno: ${error.message}`,
      asistentes: [],
      stats: {
        total: 0,
        sincronizados: 0,
        pendientes: 0,
        cacheAge: 0,
        cacheValid: false,
        mensaje: 'Error crítico'
      }
    }, { status: 500 })
  }
}

// POST - Agregar asistente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nuevoAsistente = {
      id: body.id || `asistente-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: body.nombre,
      email: body.email || '',
      cargo: body.cargo || '',
      empresa: body.empresa || '',
      presente: false,
      escarapelaImpresa: false,
      fechaRegistro: new Date().toISOString(),
      qrGenerado: false
    }

    // Agregar a memoria local inmediatamente
    db.addAsistente(nuevoAsistente)
    console.log(`➕ Asistente agregado a memoria: ${nuevoAsistente.nombre}`)

    // Intentar sincronizar con Google Sheets en background
    googleSheetsService.addAsistente(nuevoAsistente)
      .then((success: boolean) => {
        if (success) {
          db.markAsSynced(nuevoAsistente.id)
          console.log(`✅ Asistente sincronizado: ${nuevoAsistente.nombre}`)
        }
      })
      .catch((error: any) => {
        console.error(`❌ Error sincronizando asistente: ${error.message}`)
        // No revertir - mantener en memoria local  
      })

    return NextResponse.json({
      success: true,
      asistente: nuevoAsistente,
      mensaje: 'Asistente agregado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error agregando asistente:', error)
    return NextResponse.json({
      success: false,
      error: `Error agregando asistente: ${error.message}`
    }, { status: 500 })
  }
} 