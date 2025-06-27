import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  horaLlegada?: string
  presente: boolean
  escarapelaImpresa: boolean
  fechaRegistro: string
  fechaImpresion?: string
}

interface EscarapelaOptions {
  posicionesSeleccionadas: number[]
}

export async function POST(request: NextRequest) {
  try {
    const { asistentes, opciones }: { 
      asistentes: Asistente[], 
      opciones?: EscarapelaOptions 
    } = await request.json()

    if (!asistentes || asistentes.length === 0) {
      return NextResponse.json({ error: 'No hay asistentes para generar escarapelas' }, { status: 400 })
    }

    // Configuración de la matriz 11x3 sin márgenes
    const FILAS = 11
    const COLUMNAS = 3
    const TOTAL_POSICIONES = FILAS * COLUMNAS // 33 posiciones

    // Dimensiones de página A4 en mm
    const pageWidth = 210
    const pageHeight = 297

    // Dimensiones de cada escarapela (sin márgenes)
    const escarapelaWidth = pageWidth / COLUMNAS // 70mm
    const escarapelaHeight = pageHeight / FILAS // 27mm

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Función para dibujar una escarapela
    const dibujarEscarapela = (asistente: Asistente, x: number, y: number) => {
      // Área completa disponible con padding mínimo
      const padding = 0.5
      const innerX = x + padding
      const innerY = y + padding
      const innerWidth = escarapelaWidth - (padding * 2)
      const innerHeight = escarapelaHeight - (padding * 2)

      // Calcular el centro vertical del área disponible
      const centerY = y + (escarapelaHeight / 2)

      // NOMBRE DEL ASISTENTE (lo más grande posible)
      doc.setFont('helvetica', 'bold')
      
      // Empezar con tamaño muy grande y ajustar según el ancho disponible
      let nombreFontSize = 24
      const nombreCompleto = asistente.nombre
      
      // Ajustar tamaño de fuente para que quepa en el ancho
      doc.setFontSize(nombreFontSize)
      while (doc.getTextWidth(nombreCompleto) > innerWidth - 1 && nombreFontSize > 10) {
        nombreFontSize -= 0.5
        doc.setFontSize(nombreFontSize)
      }
      
      // Dividir nombre en líneas si es necesario
      const nombreLineas = doc.splitTextToSize(nombreCompleto, innerWidth - 1)
      const numeroLineasNombre = Math.min(nombreLineas.length, 2)
      
      // Posición Y inicial para centrar verticalmente todo el contenido
      let currentY
      if (asistente.cargo && asistente.cargo.trim() !== '') {
        // Si hay cargo, calcular posición para centrar ambos elementos
        const alturaTotal = (numeroLineasNombre * nombreFontSize * 0.35) + 6
        currentY = centerY - (alturaTotal / 2) + (nombreFontSize * 0.35)
      } else {
        // Si no hay cargo, centrar solo el nombre
        const alturaTotal = numeroLineasNombre * nombreFontSize * 0.35
        currentY = centerY - (alturaTotal / 2) + (nombreFontSize * 0.35)
      }
      
      // Dibujar líneas del nombre
      for (let i = 0; i < numeroLineasNombre; i++) {
        const lineaAncho = doc.getTextWidth(nombreLineas[i])
        doc.text(nombreLineas[i], innerX + (innerWidth - lineaAncho) / 2, currentY)
        currentY += nombreFontSize * 0.32
      }

      // CARGO (si existe, más grande que antes)
      if (asistente.cargo && asistente.cargo.trim() !== '') {
        currentY += 2
        
        doc.setFont('helvetica', 'normal')
        
        // Tamaño mucho más grande para el cargo
        let cargoFontSize = 18
        
        // Ajustar tamaño de fuente para que quepa en el ancho
        doc.setFontSize(cargoFontSize)
        while (doc.getTextWidth(asistente.cargo) > innerWidth - 1 && cargoFontSize > 8) {
          cargoFontSize -= 0.5
          doc.setFontSize(cargoFontSize)
        }
        
        const cargoLineas = doc.splitTextToSize(asistente.cargo, innerWidth - 1)
        const lineaAncho = doc.getTextWidth(cargoLineas[0])
        doc.text(cargoLineas[0], innerX + (innerWidth - lineaAncho) / 2, currentY)
      }
    }

    // Función para obtener coordenadas de una posición en la matriz
    const obtenerCoordenadas = (posicion: number) => {
      const fila = Math.floor(posicion / COLUMNAS)
      const columna = posicion % COLUMNAS
      
      return {
        x: columna * escarapelaWidth,
        y: fila * escarapelaHeight
      }
    }

    // Si no se especifican posiciones, llenar de forma secuencial
    const posicionesUsar = opciones?.posicionesSeleccionadas || 
      Array.from({ length: Math.min(asistentes.length, TOTAL_POSICIONES) }, (_, i) => i)

    // Generar escarapelas en las posiciones especificadas
    let asistenteIndex = 0
    let paginaActual = 0

    for (const posicion of posicionesUsar) {
      if (asistenteIndex >= asistentes.length) break

      // Si la posición es mayor que las disponibles en una página, crear nueva página
      const paginaPosicion = Math.floor(posicion / TOTAL_POSICIONES)
      if (paginaPosicion > paginaActual) {
        doc.addPage()
        paginaActual = paginaPosicion
      }

      const posicionEnPagina = posicion % TOTAL_POSICIONES
      const { x, y } = obtenerCoordenadas(posicionEnPagina)
      
      dibujarEscarapela(asistentes[asistenteIndex], x, y)
      asistenteIndex++
    }

    // Agregar información de pie de página
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      
      // Información del documento
      const info = `Escarapelas - ${asistentes.length} asistentes - Página ${i}/${totalPages}`
      doc.text(info, pageWidth / 2, pageHeight - 2, { align: 'center' })
      
      // Fecha de generación
      const fecha = new Date().toLocaleString('es-ES')
      doc.text(`Generado: ${fecha}`, 5, pageHeight - 2)
    }

    // Generar buffer del PDF
    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="escarapelas-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error generando PDF de escarapelas:', error)
    return NextResponse.json(
      { error: 'Error generando PDF de escarapelas' },
      { status: 500 }
    )
  }
} 