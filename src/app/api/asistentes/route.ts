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

export async function GET() {
  try {
    console.log('🔄 GET /api/asistentes - Obteniendo lista de asistentes')
    
    // Obtener asistentes de memoria local
    const memoryAsistentes = db.getAsistentes()
    
    // Intentar cargar desde Google Sheets si está configurado
    if (googleSheetsService.isConfigured()) {
      try {
        console.log('📊 Cargando desde Google Sheets...')
        
        // Primero intentar obtener datos directamente de Google Sheets
        const sheetsAsistentes = await googleSheetsService.getAsistentes()
        
        if (sheetsAsistentes && sheetsAsistentes.length > 0) {
          console.log(`✅ ${sheetsAsistentes.length} asistentes encontrados en Google Sheets`)
          
          // Actualizar la base de datos local con los datos de Google Sheets
          db.limpiarTodo()
          sheetsAsistentes.forEach(asistente => {
            db.addAsistente(asistente)
          })
          
          return NextResponse.json(sheetsAsistentes)
        } else {
          console.log('📝 Google Sheets está vacío')
          
          // Si hay datos en memoria, sincronizarlos con Google Sheets
          if (memoryAsistentes.length > 0) {
            console.log('🔄 Sincronizando datos de memoria con Google Sheets...')
            const sincronizados = await googleSheetsService.syncWithMemoryDatabase(memoryAsistentes)
            
            if (sincronizados && sincronizados.length > 0) {
              db.limpiarTodo()
              sincronizados.forEach(asistente => {
                db.addAsistente(asistente)
              })
              
              console.log(`✅ ${sincronizados.length} asistentes sincronizados`)
              return NextResponse.json(sincronizados)
            }
          }
        }
        
      } catch (sheetsError) {
        console.error('❌ Error cargando desde Google Sheets:', sheetsError)
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