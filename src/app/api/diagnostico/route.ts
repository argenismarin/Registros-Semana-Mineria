import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando diagnóstico completo del sistema...')
    
    const diagnostico = {
      timestamp: new Date().toISOString(),
      googleSheets: {
        configurado: false,
        spreadsheetId: '',
        conexionExitosa: false,
        asistentesEnSheets: 0,
        error: null as string | null
      },
      memoriaLocal: {
        asistentesEnMemoria: 0,
        ultimaActualizacion: null as string | null
      },
      sincronizacion: {
        funcionando: false,
        pruebaRealizada: false,
        error: null as any
      },
      variablesEntorno: {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_SHEETS_SPREADSHEET_ID: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID
      }
    }

    // 1. Verificar configuración de Google Sheets
    diagnostico.googleSheets.configurado = googleSheetsService.isConfigured()
    diagnostico.googleSheets.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'NO_CONFIGURADO'
    
    console.log('📊 Google Sheets configurado:', diagnostico.googleSheets.configurado)

    // 2. Verificar asistentes en memoria local
    const asistentesMemoria = db.getAllAsistentes()
    diagnostico.memoriaLocal.asistentesEnMemoria = asistentesMemoria.length
    
    if (asistentesMemoria.length > 0) {
      const fechas = asistentesMemoria
        .map((a: any) => new Date(a.fechaRegistro))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime())
      diagnostico.memoriaLocal.ultimaActualizacion = fechas[0].toISOString()
    }
    
    console.log('💾 Asistentes en memoria:', diagnostico.memoriaLocal.asistentesEnMemoria)

    // 3. Probar conexión con Google Sheets
    if (diagnostico.googleSheets.configurado) {
      try {
        const asistentesSheets = await googleSheetsService.getAsistentes()
        diagnostico.googleSheets.conexionExitosa = true
        diagnostico.googleSheets.asistentesEnSheets = asistentesSheets.length
        console.log('📊 ✅ Conexión exitosa a Google Sheets:', asistentesSheets.length, 'asistentes')
        
        // 4. Probar sincronización (solo si hay datos)
        if (asistentesMemoria.length > 0 && asistentesSheets.length > 0) {
          const primerAsistente = asistentesMemoria[0]
          const asistenteEnSheets = asistentesSheets.find(a => a.id === primerAsistente.id)
          
          if (asistenteEnSheets) {
            // Comparar datos
            const mismoNombre = asistenteEnSheets.nombre === primerAsistente.nombre
            const mismoEstadoPresente = asistenteEnSheets.presente === primerAsistente.presente
            const mismoEstadoEscarapela = asistenteEnSheets.escarapelaImpresa === primerAsistente.escarapelaImpresa
            
            diagnostico.sincronizacion.funcionando = mismoNombre && mismoEstadoPresente && mismoEstadoEscarapela
            diagnostico.sincronizacion.pruebaRealizada = true
            
            if (!diagnostico.sincronizacion.funcionando) {
              diagnostico.sincronizacion.error = {
                asistenteId: primerAsistente.id,
                memoria: {
                  nombre: primerAsistente.nombre,
                  presente: primerAsistente.presente,
                  escarapelaImpresa: primerAsistente.escarapelaImpresa
                },
                sheets: {
                  nombre: asistenteEnSheets.nombre,
                  presente: asistenteEnSheets.presente,
                  escarapelaImpresa: asistenteEnSheets.escarapelaImpresa
                }
              }
            }
            
            console.log('🔄 Sincronización funcionando:', diagnostico.sincronizacion.funcionando)
          }
        }
        
      } catch (error) {
        diagnostico.googleSheets.conexionExitosa = false
        diagnostico.googleSheets.error = error instanceof Error ? error.message : 'Error desconocido'
        console.error('📊 ❌ Error conectando a Google Sheets:', error)
      }
    } else {
      console.log('⚠️ Google Sheets no configurado correctamente')
    }

    // 5. Verificar estructura de datos
    const estructuraDatos = {
      camposRequeridos: ['id', 'nombre', 'presente', 'escarapelaImpresa'],
      asistentesConProblemas: asistentesMemoria.filter(a => 
        !a.id || !a.nombre || a.presente === undefined || a.escarapelaImpresa === undefined
      ).length
    }

    const resumen = {
      estado: diagnostico.googleSheets.configurado && diagnostico.googleSheets.conexionExitosa ? 'FUNCIONAL' : 'CON_PROBLEMAS',
      recomendaciones: [] as string[]
    }

    // Generar recomendaciones
    if (!diagnostico.googleSheets.configurado) {
      resumen.recomendaciones.push('Configurar variables de entorno de Google Sheets')
    }
    
    if (!diagnostico.googleSheets.conexionExitosa && diagnostico.googleSheets.configurado) {
      resumen.recomendaciones.push('Verificar credenciales y permisos de Google Sheets')
    }
    
    if (diagnostico.sincronizacion.pruebaRealizada && !diagnostico.sincronizacion.funcionando) {
      resumen.recomendaciones.push('Los datos no están sincronizados. Ejecutar sincronización manual.')
    }
    
    if (estructuraDatos.asistentesConProblemas > 0) {
      resumen.recomendaciones.push(`${estructuraDatos.asistentesConProblemas} asistentes tienen datos incompletos`)
    }

    return NextResponse.json({
      diagnostico,
      estructuraDatos,
      resumen
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json(
      { 
        error: 'Error ejecutando diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// POST para forzar sincronización
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Forzando sincronización completa...')
    
    if (!googleSheetsService.isConfigured()) {
      return NextResponse.json(
        { error: 'Google Sheets no está configurado' },
        { status: 400 }
      )
    }

    const asistentesMemoria = db.getAllAsistentes()
    console.log(`📊 Sincronizando ${asistentesMemoria.length} asistentes...`)
    
    const resultados = {
      total: asistentesMemoria.length,
      exitosos: 0,
      fallidos: 0,
      errores: [] as string[]
    }

    for (const asistente of asistentesMemoria) {
      try {
        const success = await googleSheetsService.updateAsistente(asistente)
        if (success) {
          resultados.exitosos++
        } else {
          resultados.fallidos++
          resultados.errores.push(`Error actualizando ${asistente.nombre}`)
        }
      } catch (error) {
        resultados.fallidos++
        resultados.errores.push(`Error sincronizando ${asistente.nombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    console.log(`✅ Sincronización completada: ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos`)

    return NextResponse.json({
      success: true,
      message: 'Sincronización forzada completada',
      resultados
    })

  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error)
    return NextResponse.json(
      { 
        error: 'Error en sincronización forzada',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 