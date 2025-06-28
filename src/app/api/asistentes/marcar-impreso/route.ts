import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { asistentesIds }: { asistentesIds: string[] } = await request.json()

    if (!asistentesIds || asistentesIds.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron IDs de asistentes' }, { status: 400 })
    }

    let asistentesActualizados = 0
    const resultados: string[] = []

    // Marcar como impreso cada asistente
    for (const id of asistentesIds) {
      const asistenteActualizado = db.marcarEscarapelaImpresa(id)
      if (asistenteActualizado) {
        asistentesActualizados++
        resultados.push(asistenteActualizado.nombre)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${asistentesActualizados} escarapelas marcadas como impresas`,
      asistentesActualizados,
      asistentesProcesados: resultados,
      fechaImpresion: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error marcando escarapelas como impresas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 