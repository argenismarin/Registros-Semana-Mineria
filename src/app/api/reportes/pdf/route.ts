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
  eventoNombre?: string
  mostrarCargo?: boolean
  mostrarEmpresa?: boolean
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
      const eventoNombre = opciones?.eventoNombre || 'EVENTO'
      
      // Borde de la escarapela
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.rect(x, y, escarapelaWidth, escarapelaHeight)

      // Área interna con padding
      const padding = 2
      const innerX = x + padding
      const innerY = y + padding
      const innerWidth = escarapelaWidth - (padding * 2)
      const innerHeight = escarapelaHeight - (padding * 2)

      // Título del evento
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const tituloAncho = doc.getTextWidth(eventoNombre)
      doc.text(eventoNombre, innerX + (innerWidth - tituloAncho) / 2, innerY + 4)

      // Nombre del asistente (centrado y destacado)
      let currentY = innerY + 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      
      // Dividir nombre en líneas si es muy largo
      const nombreCompleto = asistente.nombre
      const nombreLineas = doc.splitTextToSize(nombreCompleto, innerWidth - 2)
      
      for (let i = 0; i < nombreLineas.length && i < 2; i++) {
        const lineaAncho = doc.getTextWidth(nombreLineas[i])
        doc.text(nombreLineas[i], innerX + (innerWidth - lineaAncho) / 2, currentY)
        currentY += 3.5
      }

      // Cargo (si está disponible y se debe mostrar)
      if (opciones?.mostrarCargo !== false && asistente.cargo) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        const cargoLineas = doc.splitTextToSize(asistente.cargo, innerWidth - 2)
        
        for (let i = 0; i < cargoLineas.length && i < 1; i++) {
          const lineaAncho = doc.getTextWidth(cargoLineas[i])
          doc.text(cargoLineas[i], innerX + (innerWidth - lineaAncho) / 2, currentY)
          currentY += 3
        }
      }

      // Empresa (si está disponible y se debe mostrar)
      if (opciones?.mostrarEmpresa !== false && asistente.empresa) {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'italic')
        const empresaLineas = doc.splitTextToSize(asistente.empresa, innerWidth - 2)
        
        for (let i = 0; i < empresaLineas.length && i < 1; i++) {
          const lineaAncho = doc.getTextWidth(empresaLineas[i])
          doc.text(empresaLineas[i], innerX + (innerWidth - lineaAncho) / 2, currentY)
          currentY += 2.5
        }
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