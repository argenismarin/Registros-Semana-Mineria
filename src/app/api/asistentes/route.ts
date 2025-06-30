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
    
    // 2. SI LA MEMORIA ESTÁ VACÍA, CARGAR DATOS DE PRUEBA O GOOGLE SHEETS
    if (stats.total === 0) {
      // Si no hay datos en memoria, cargar algunos de prueba
      console.log('📊 No hay datos en memoria, inicializando datos de prueba...')
      db.addAsistente({
        id: 'demo-1',
        nombre: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        cargo: 'Desarrollador',
        empresa: 'Tech Corp',
        presente: false,
        escarapelaImpresa: false,
        fechaRegistro: new Date().toISOString(),
        qrGenerado: false
      })
      db.addAsistente({
        id: 'demo-2',
        nombre: 'María García',
        email: 'maria@ejemplo.com',
        cargo: 'Diseñadora',
        empresa: 'Design Studio',
        presente: true,
        escarapelaImpresa: false,
        fechaRegistro: new Date().toISOString(),
        horaLlegada: new Date().toISOString(),
        qrGenerado: true,
        fechaGeneracionQR: new Date().toISOString()
      })
      db.addAsistente({
        id: 'demo-3',
        nombre: 'Carlos Rodríguez',
        email: 'carlos@ejemplo.com',
        cargo: 'Gerente',
        empresa: 'Tech Corp',
        presente: false,
        escarapelaImpresa: false,
        fechaRegistro: new Date().toISOString(),
        qrGenerado: false
      })
      console.log('✅ Datos de prueba inicializados')
    }
    
    // 3. INTENTAR SINCRONIZAR CON GOOGLE SHEETS (SIN BLOQUEAR)
    if (googleSheetsService.isConfigured() && stats.total < 50) {
      // Solo intentar si no hay muchos datos ya cargados
      console.log('🔄 Intentando cargar datos adicionales desde Google Sheets...')
      setTimeout(async () => {
        try {
          const sheetsAsistentes = await googleSheetsService.getAsistentes()
          if (sheetsAsistentes && sheetsAsistentes.length > stats.total) {
            db.replaceAllAsistentes(sheetsAsistentes)
            console.log(`✅ Sincronizado: ${sheetsAsistentes.length} asistentes desde Google Sheets`)
          }
                 } catch (error: any) {
           if (error.status === 429) {
             console.warn('⚠️ Rate limit de Google Sheets alcanzado - usando datos locales')
           } else {
             console.warn('⚠️ Error sincronizando con Google Sheets:', error.message || error)
           }
         }
      }, 100) // No bloquear la respuesta principal
    }

    // 4. OBTENER DATOS FINALES DE MEMORIA (incluye preservados + nuevos)
    const asistentes = db.getAllAsistentes()
    console.log(`📋 Retornando ${asistentes.length} asistentes`)

    // 5. INFORMACIÓN DE SINCRONIZACIÓN PARA EL CLIENTE
    const respuesta = {
      asistentes,
      syncInfo: {
        total: asistentes.length,
        sincronizados: stats.sincronizados,
        pendientes: stats.pendientes,
        ultimaSync: 'local', // ✅ ARREGLADO: Usar valor fijo en lugar de stats.lastSync inexistente
        fuenteDatos: 'memoria-local'
      }
    }

    return NextResponse.json(asistentes) // Solo asistentes para compatibilidad
    
  } catch (error) {
    console.error('❌ Error en GET /api/asistentes:', error)
    
    // FALLBACK: devolver datos de memoria aunque haya errores
    try {
      const asistentes = db.getAllAsistentes()
      console.log(`🔄 Fallback: retornando ${asistentes.length} asistentes de memoria`)
      return NextResponse.json(asistentes)
    } catch (fallbackError) {
      console.error('❌ Error crítico en fallback:', fallbackError)
      // Devolver array vacío como último recurso
      return NextResponse.json([])
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