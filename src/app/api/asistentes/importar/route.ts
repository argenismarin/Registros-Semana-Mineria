import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db, { type Asistente } from '@/lib/database'
import googleSheetsService from '@/lib/googleSheets'

interface AsistenteImportado {
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
}

interface ResultadoImportacion {
  exitosos: number
  errores: number
  duplicados: number
  detalles: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { asistentes }: { asistentes: AsistenteImportado[] } = await request.json()

    if (!asistentes || !Array.isArray(asistentes)) {
      return NextResponse.json(
        { error: 'Lista de asistentes requerida' },
        { status: 400 }
      )
    }

    const resultado: ResultadoImportacion = {
      exitosos: 0,
      errores: 0,
      duplicados: 0,
      detalles: []
    }

    const asistentesExistentes = db.getAllAsistentes()
    const asistentesProcesados: Asistente[] = []

    for (let i = 0; i < asistentes.length; i++) {
      const asistenteImportado = asistentes[i]
      
      try {
        // Validaciones básicas
        if (!asistenteImportado.nombre || asistenteImportado.nombre.trim() === '') {
          resultado.errores++
          resultado.detalles.push(`Línea ${i + 2}: Nombre requerido`)
          continue
        }

        // Verificar duplicados por nombre y email
        const nombreNormalizado = asistenteImportado.nombre.trim().toLowerCase()
        const emailNormalizado = asistenteImportado.email?.trim().toLowerCase()

        const existeEnBD = asistentesExistentes.some(a => 
          a.nombre.toLowerCase() === nombreNormalizado ||
          (emailNormalizado && a.email?.toLowerCase() === emailNormalizado)
        )

        const existeEnLote = asistentesProcesados.some(a => 
          a.nombre.toLowerCase() === nombreNormalizado ||
          (emailNormalizado && a.email?.toLowerCase() === emailNormalizado)
        )

        if (existeEnBD || existeEnLote) {
          resultado.duplicados++
          resultado.detalles.push(`Línea ${i + 2}: ${asistenteImportado.nombre} ya existe (duplicado)`)
          continue
        }

        // Validar email si se proporciona
        if (asistenteImportado.email && asistenteImportado.email.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(asistenteImportado.email.trim())) {
            resultado.errores++
            resultado.detalles.push(`Línea ${i + 2}: Email inválido (${asistenteImportado.email})`)
            continue
          }
        }

        // Crear nuevo asistente
        const nuevoAsistente: Asistente = {
          id: uuidv4(),
          nombre: asistenteImportado.nombre.trim(),
          email: asistenteImportado.email?.trim() || '',
          cargo: asistenteImportado.cargo?.trim() || '',
          empresa: asistenteImportado.empresa?.trim() || '',
          presente: false,
          escarapelaImpresa: false,
          fechaRegistro: new Date().toISOString(),
          horaLlegada: undefined
        }

        // Agregar a base de datos
        db.addAsistente(nuevoAsistente)
        asistentesProcesados.push(nuevoAsistente)

        resultado.exitosos++
        resultado.detalles.push(`Línea ${i + 2}: ${nuevoAsistente.nombre} importado exitosamente`)

      } catch (error) {
        resultado.errores++
        resultado.detalles.push(`Línea ${i + 2}: Error procesando ${asistenteImportado.nombre}`)
      }
    }

    // Sincronizar con Google Sheets si está configurado
    if (googleSheetsService.isConfigured() && asistentesProcesados.length > 0) {
      try {
        for (const asistente of asistentesProcesados) {
          await googleSheetsService.addAsistente(asistente)
        }
        resultado.detalles.push(`${asistentesProcesados.length} asistentes sincronizados con Google Sheets`)
      } catch (error) {
        resultado.detalles.push('Advertencia: Error sincronizando con Google Sheets')
        console.error('Error sincronizando con Google Sheets:', error)
      }
    }

    // Notificar a clientes en tiempo real sobre la importación masiva
    if (asistentesProcesados.length > 0) {
      try {
        await fetch(`${request.nextUrl.origin}/api/socket.io`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'importacion-masiva',
            data: {
              cantidad: asistentesProcesados.length,
              asistentes: asistentesProcesados
            }
          })
        })
      } catch (error) {
        console.error('Error notificando importación masiva:', error)
      }
    }

    return NextResponse.json(resultado, { status: 200 })

  } catch (error) {
    console.error('Error importando asistentes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 