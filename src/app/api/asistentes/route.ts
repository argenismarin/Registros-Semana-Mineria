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
    console.log('🌐 GET /api/asistentes - Cargando asistentes desde Google Sheets...')
    
    // 1. VERIFICAR CONFIGURACIÓN DE GOOGLE SHEETS
    if (!googleSheetsService.isConfigured()) {
      console.log('❌ Google Sheets no configurado')
      return NextResponse.json(
        { error: 'Google Sheets no configurado' },
        { status: 500 }
      )
    }

    // 2. CARGAR SIEMPRE DESDE GOOGLE SHEETS (MODO ONLINE)
    console.log('🔄 Cargando datos directamente desde Google Sheets...')
    
    const sheetsAsistentes = await googleSheetsService.getAsistentes()
    console.log(`📊 Obtenidos ${sheetsAsistentes.length} asistentes desde Google Sheets`)
    
    // 3. ACTUALIZAR MEMORIA LOCAL CON DATOS FRESCOS
    db.replaceAllAsistentes(sheetsAsistentes)
    console.log(`✅ Memoria local actualizada con ${sheetsAsistentes.length} asistentes`)

    // 4. RETORNAR DATOS FRESCOS
    return NextResponse.json(sheetsAsistentes)
    
  } catch (error) {
    console.error('❌ Error cargando desde Google Sheets:', error)
    
    // FALLBACK: intentar devolver datos de memoria como último recurso
    try {
      const asistentesMemoria = db.getAllAsistentes()
      if (asistentesMemoria.length > 0) {
        console.log(`🔄 Fallback: retornando ${asistentesMemoria.length} asistentes de memoria`)
        return NextResponse.json(asistentesMemoria)
      } else {
        throw new Error('No hay datos en memoria')
      }
    } catch (fallbackError) {
      console.error('❌ Error crítico en fallback:', fallbackError)
      return NextResponse.json(
        { error: 'Error cargando asistentes y no hay datos de respaldo' },
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

    // SINCRONIZACIÓN INMEDIATA CON GOOGLE SHEETS
    if (!googleSheetsService.isConfigured()) {
      console.log('❌ Google Sheets no configurado')
      return NextResponse.json(
        { error: 'Google Sheets no configurado' },
        { status: 500 }
      )
    }

    try {
      console.log('🌐 Sincronizando inmediatamente con Google Sheets:', nuevoAsistente.nombre)
      
      const syncSuccess = await googleSheetsService.addAsistente(nuevoAsistente)
      
      if (syncSuccess) {
        // Agregar a base de datos local SOLO después de sincronización exitosa
        db.addAsistente(nuevoAsistente)
        db.markAsSynced(nuevoAsistente.id)
        
        console.log(`✅ Asistente ${nuevoAsistente.nombre} creado y sincronizado con Google Sheets`)
        
        return NextResponse.json({
          success: true,
          asistente: nuevoAsistente,
          mensaje: 'Asistente creado y sincronizado con Google Sheets'
        }, { status: 201 })
      } else {
        throw new Error('Error sincronizando con Google Sheets')
      }
    } catch (error) {
      console.error('❌ Error sincronizando con Google Sheets:', error)
      return NextResponse.json(
        { 
          error: 'Error sincronizando con Google Sheets',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error en POST /api/asistentes:', error)
    return NextResponse.json(
      { error: 'Error creando asistente' },
      { status: 500 }
    )
  }
} 