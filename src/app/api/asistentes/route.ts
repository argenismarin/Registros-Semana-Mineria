import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db, { type Asistente, inicializarDatosPrueba } from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

// Inicializar datos de prueba si la base de datos está vacía
let datosInicializados = false

function asegurarDatosPrueba() {
  if (!datosInicializados && db.getAsistentes().length === 0) {
    console.log('🔄 Base de datos vacía, inicializando datos de prueba...')
    inicializarDatosPrueba()
    datosInicializados = true
  }
}

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

export async function GET() {
  try {
    console.log('🔄 GET /api/asistentes - Obteniendo lista de asistentes')
    
    // Asegurar que hay datos de prueba
    asegurarDatosPrueba()
    
    // Obtener asistentes de memoria local
    const memoryAsistentes = db.getAsistentes()
    
    // Sincronizar con Google Sheets si está configurado
    if (googleSheetsService.isConfigured()) {
      try {
        console.log('📊 Sincronizando con Google Sheets...')
        
        // Usar el método de sincronización bidireccional
        const sincronizados = await googleSheetsService.syncWithMemoryDatabase(memoryAsistentes)
        
        // Actualizar la base de datos local con los datos sincronizados
        // Esto asegura que los checkboxes de Google Sheets tengan prioridad
        db.limpiarTodo()
        sincronizados.forEach(asistente => {
          db.addAsistente(asistente)
        })
        
        console.log(`✅ ${sincronizados.length} asistentes sincronizados con Google Sheets`)
        return NextResponse.json(sincronizados)
        
      } catch (sheetsError) {
        console.error('❌ Error sincronizando con Google Sheets:', sheetsError)
        console.log('📝 Usando datos de memoria local como fallback')
      }
    } else {
      console.log('⚠️ Google Sheets no configurado, usando solo memoria local')
    }
    
    // Fallback a memoria local
    const asistentes = db.getAsistentes()
    console.log(`📝 Retornando ${asistentes.length} asistentes de memoria local`)
    
    return NextResponse.json(asistentes)
    
  } catch (error) {
    console.error('❌ Error en GET /api/asistentes:', error)
    return NextResponse.json(
      { error: 'Error obteniendo asistentes' },
      { status: 500 }
    )
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