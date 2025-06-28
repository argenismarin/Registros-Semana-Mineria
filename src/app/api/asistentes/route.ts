import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db, { type Asistente } from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

// Base de datos sin datos de prueba automáticos

// Sincronización con Google Sheets
async function sincronizarConGoogleSheets(asistente: Asistente) {
  try {
    if (googleSheetsService.isConfigured()) {
      await googleSheetsService.addAsistente(asistente)
      console.log('Asistente sincronizado con Google Sheets:', asistente.nombre)
    } else {
      console.log('Google Sheets no configurado, solo guardando en memoria')
    }
  } catch (error) {
    console.error('Error sincronizando con Google Sheets:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 GET /api/asistentes - Cargando asistentes...')
    
    // 1. VERIFICAR ESTADO ACTUAL DE LA MEMORIA
    const stats = db.getSyncStats()
    console.log('📊 Estadísticas actuales:', stats)
    
    // 2. SI LA MEMORIA ESTÁ VACÍA O HAY POCOS DATOS, CARGAR DESDE GOOGLE SHEETS
    const shouldLoadFromSheets = stats.total === 0 || 
      (googleSheetsService.isConfigured() && stats.total < 10) // Threshold arbitrario
    
    if (shouldLoadFromSheets && googleSheetsService.isConfigured()) {
      try {
        console.log('🔄 Cargando datos desde Google Sheets...')
        const sheetsAsistentes = await googleSheetsService.getAsistentes()
        
        if (sheetsAsistentes && sheetsAsistentes.length > 0) {
          // 3. USAR replaceAllAsistentes QUE PRESERVA CAMBIOS LOCALES
          db.replaceAllAsistentes(sheetsAsistentes, true)
          console.log(`✅ Cargados ${sheetsAsistentes.length} asistentes desde Google Sheets`)
        } else {
          console.log('⚠️ Google Sheets vacío o sin datos válidos')
        }
      } catch (error) {
        console.error('⚠️ Error cargando desde Google Sheets:', error)
        // Continuar con datos de memoria si Google Sheets falla
      }
    } else {
      console.log(`📊 Usando datos de memoria: ${stats.total} asistentes (${stats.pendientes} pendientes)`)
    }

    // 4. OBTENER DATOS FINALES DE MEMORIA (incluye preservados + nuevos)
    const asistentes = db.getAsistentes()
    console.log(`📋 Retornando ${asistentes.length} asistentes`)

    // 5. INFORMACIÓN DE SINCRONIZACIÓN PARA EL CLIENTE
    const respuesta = {
      asistentes,
      syncInfo: {
        total: asistentes.length,
        sincronizados: stats.sincronizados,
        pendientes: stats.pendientes,
        ultimaSync: stats.lastSync,
        fuenteDatos: shouldLoadFromSheets ? 'google-sheets' : 'memoria-local'
      }
    }

    return NextResponse.json(asistentes) // Solo asistentes para compatibilidad
    
  } catch (error) {
    console.error('❌ Error en GET /api/asistentes:', error)
    
    // FALLBACK: devolver datos de memoria aunque haya errores
    try {
      const asistentes = db.getAsistentes()
      console.log(`🔄 Fallback: retornando ${asistentes.length} asistentes de memoria`)
      return NextResponse.json(asistentes)
    } catch (fallbackError) {
      console.error('❌ Error crítico en fallback:', fallbackError)
      return NextResponse.json(
        { error: 'Error cargando asistentes' },
        { status: 500 }
      )
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('➕ POST /api/asistentes - Creando nuevo asistente')
    
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.nombre || body.nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Validar email si se proporciona
    if (body.email && body.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email.trim())) {
        return NextResponse.json(
          { error: 'El email no tiene un formato válido' },
          { status: 400 }
        )
      }
    }

    // Crear nuevo asistente
    const nuevoAsistente: Asistente = {
      id: uuidv4(),
      nombre: body.nombre.trim(),
      email: body.email?.trim() || '',
      cargo: body.cargo?.trim() || '',
      empresa: body.empresa?.trim() || '',
      presente: false,
      escarapelaImpresa: false,
      fechaRegistro: new Date().toISOString(),
      qrGenerado: false
    }

    // Agregar a base de datos local
    db.addAsistente(nuevoAsistente)

    // Sincronizar con Google Sheets si está configurado
    if (googleSheetsService.isConfigured()) {
      try {
        await googleSheetsService.addAsistente(nuevoAsistente)
        console.log('📊 Asistente sincronizado con Google Sheets')
      } catch (error) {
        console.error('⚠️ Error sincronizando con Google Sheets:', error)
      }
    }

    console.log(`✅ Asistente ${nuevoAsistente.nombre} creado exitosamente`)

    return NextResponse.json(nuevoAsistente, { status: 201 })

  } catch (error) {
    console.error('❌ Error en POST /api/asistentes:', error)
    return NextResponse.json(
      { error: 'Error creando asistente' },
      { status: 500 }
    )
  }
} 