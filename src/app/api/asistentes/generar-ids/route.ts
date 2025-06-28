import { NextRequest, NextResponse } from 'next/server'
import googleSheetsService from '@/lib/googleSheets'
import db from '@/lib/database'

// POST /api/asistentes/generar-ids - Generar IDs para registros sin ID en Google Sheets
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando generación de IDs faltantes...')
    
    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json(
        { error: 'Google Sheets no está configurado' },
        { status: 400 }
      )
    }

    // 1. Obtener todos los datos RAW de Google Sheets (incluyendo registros sin ID)
    const sheetsData = await googleSheetsService.getRawSheetData()
    
    if (!sheetsData || sheetsData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay datos en Google Sheets para procesar',
        resultados: {
          total: 0,
          conId: 0,
          sinId: 0,
          generados: 0,
          errores: []
        }
      })
    }

    console.log(`📊 Procesando ${sheetsData.length} registros de Google Sheets...`)

    const resultados = {
      total: sheetsData.length,
      conId: 0,
      sinId: 0,
      generados: 0,
      errores: [] as string[]
    }

    const timestamp = Date.now()
    const updates: any[] = []

    // 2. Procesar cada registro y generar IDs donde falten
    for (let i = 0; i < sheetsData.length; i++) {
      const row = sheetsData[i]
      const rowNumber = i + 2 // Fila en Google Sheets (empezando en A2)
      
      try {
        // Verificar si ya tiene ID (columna A)
        const currentId = row[0]
        
        if (currentId && currentId.trim() !== '') {
          // Ya tiene ID
          resultados.conId++
          console.log(`✅ Registro ${rowNumber} ya tiene ID: ${currentId}`)
          continue
        }

        // Verificar que tenga al menos nombre (columna B)
        const nombre = row[1]
        if (!nombre || nombre.trim() === '') {
          resultados.errores.push(`Fila ${rowNumber}: No tiene nombre, saltando...`)
          continue
        }

        resultados.sinId++

        // 3. Generar ID único
        const nuevoId = `generated-${timestamp}-${i + 1}`
        
        // 4. Preparar actualización para Google Sheets
        const updatedRow = [...row]
        updatedRow[0] = nuevoId // Asignar ID en columna A
        
        // Asegurar que tenga valores por defecto para campos requeridos
        if (updatedRow.length < 10) {
          while (updatedRow.length < 10) {
            updatedRow.push('')
          }
        }
        
        // Valores por defecto para campos booleanos si están vacíos
        if (!updatedRow[5] || updatedRow[5] === '') updatedRow[5] = false // presente
        if (!updatedRow[6] || updatedRow[6] === '') updatedRow[6] = false // escarapelaImpresa
        if (!updatedRow[7] || updatedRow[7] === '') updatedRow[7] = new Date().toISOString() // fechaRegistro

        updates.push({
          range: `Asistentes!A${rowNumber}:J${rowNumber}`,
          values: [updatedRow]
        })

        resultados.generados++
        console.log(`🆕 Generado ID para "${nombre}": ${nuevoId}`)

      } catch (error) {
        const errorMsg = `Error procesando fila ${rowNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        resultados.errores.push(errorMsg)
        console.error('❌', errorMsg)
      }
    }

    // 5. Aplicar todas las actualizaciones en lote si hay cambios
    if (updates.length > 0) {
      console.log(`🚀 Aplicando ${updates.length} actualizaciones de IDs en Google Sheets...`)
      
      const success = await googleSheetsService.batchUpdateSheetData(updates)
      
      if (!success) {
        throw new Error('Error aplicando actualizaciones en lote a Google Sheets')
      }
      
      console.log(`✅ IDs actualizados exitosamente en Google Sheets`)
      
      // 6. Recargar datos en memoria local para reflejar los nuevos IDs
      console.log('🔄 Recargando datos en memoria local...')
      const asistentesActualizados = await googleSheetsService.getAsistentes()
      db.replaceAllAsistentes(asistentesActualizados)
      
      console.log(`💾 ${asistentesActualizados.length} asistentes recargados en memoria local`)
    }

    // 7. Notificar a otros clientes sobre la actualización
    if (resultados.generados > 0) {
      try {
        await fetch(`${request.nextUrl.origin}/api/socket.io`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'ids-generados',
            data: {
              generados: resultados.generados,
              timestamp: new Date().toISOString()
            }
          })
        })
      } catch (socketError) {
        console.error('Error notificando generación de IDs:', socketError)
      }
    }

    const response = {
      success: true,
      message: `Generación de IDs completada: ${resultados.generados} IDs generados de ${resultados.sinId} registros sin ID`,
      resultados,
      recomendacion: resultados.generados > 0 
        ? 'Se recomienda recargar la página para ver los cambios'
        : 'Todos los registros ya tenían IDs válidos'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error generando IDs:', error)
    return NextResponse.json(
      { 
        error: 'Error generando IDs para registros',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// GET /api/asistentes/generar-ids - Información sobre registros sin ID
export async function GET(request: NextRequest) {
  try {
    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json(
        { error: 'Google Sheets no está configurado' },
        { status: 400 }
      )
    }

    // Obtener datos raw para análisis
    const sheetsData = await googleSheetsService.getRawSheetData()
    
    if (!sheetsData || sheetsData.length === 0) {
      return NextResponse.json({
        total: 0,
        conId: 0,
        sinId: 0,
        registrosSinId: []
      })
    }

    const analisis = {
      total: sheetsData.length,
      conId: 0,
      sinId: 0,
      registrosSinId: [] as any[]
    }

    // Analizar cada registro
    for (let i = 0; i < sheetsData.length; i++) {
      const row = sheetsData[i]
      const currentId = row[0]
      const nombre = row[1]
      
      if (currentId && currentId.trim() !== '') {
        analisis.conId++
      } else if (nombre && nombre.trim() !== '') {
        analisis.sinId++
        analisis.registrosSinId.push({
          fila: i + 2,
          nombre: nombre,
          email: row[2] || '',
          cargo: row[3] || '',
          empresa: row[4] || ''
        })
      }
    }

    return NextResponse.json(analisis)

  } catch (error) {
    console.error('❌ Error analizando IDs:', error)
    return NextResponse.json(
      { 
        error: 'Error analizando registros',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 