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
  modoImpresion?: 'individual' | 'matriz'
  posicionesSeleccionadas?: number[]
}

export async function POST(request: NextRequest) {
  try {
    const { asistentes, opciones }: { 
      asistentes: Asistente[]
      opciones?: EscarapelaOptions 
    } = await request.json()

    if (!asistentes || asistentes.length === 0) {
      return NextResponse.json({ error: 'No hay asistentes para generar escarapelas' }, { status: 400 })
    }

    const modoImpresion = opciones?.modoImpresion || 'individual'

    if (modoImpresion === 'matriz') {
      // MODO MATRIZ: Múltiples escarapelas en A4
      return generarPDFMatriz(asistentes, opciones)
    } else {
      // MODO INDIVIDUAL: 98mm x 128mm (una por página)
      return generarPDFIndividual(asistentes)
    }

  } catch (error) {
    console.error('Error generando PDF de escarapelas:', error)
    return NextResponse.json(
      { error: 'Error generando PDF de escarapelas' },
      { status: 500 }
    )
  }
}

// Función para generar PDF individual (98mm x 128mm)
async function generarPDFIndividual(asistentes: Asistente[]) {
  // Dimensiones de la escarapela física
  const escarapelaWidth = 98  // mm
  const escarapelaHeight = 128 // mm
  
  // Área de texto expandida horizontalmente para más impacto
  const areaTexto = {
    x: 16,        // 1.6cm desde la izquierda (1cm más a la izquierda)
    y: 53,        // 5.3cm desde arriba (POSICIÓN VERTICAL FIJA)
    width: 64,    // 6.4cm de ancho (2cm más ancho total)
    height: 49.5  // desde 5.3cm hasta 2.5cm del final = 4.95cm
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [escarapelaWidth, escarapelaHeight] // Tamaño exacto de la escarapela
  })

  // Limpiar metadatos para evitar información automática
  doc.setProperties({
    title: '',
    subject: '',
    author: '',
    keywords: '',
    creator: ''
  })

  // Función para dibujar texto en el área específica
  const dibujarTextoEscarapela = (asistente: Asistente) => {
    // Centro horizontal del área de texto
    const centroHorizontal = areaTexto.x + (areaTexto.width / 2)
    
    // NOMBRE DEL ASISTENTE - TAMAÑO FIJO
    doc.setFont('helvetica', 'bold')
    
    // Tamaño fijo para el nombre (igual que modalidad)
    const nombreFontSize = 18  // Mismo tamaño que modalidad/asistente
    const nombreCompleto = asistente.nombre
    
    doc.setFontSize(nombreFontSize)
    
    // Dividir nombre en líneas si es necesario
    const nombreLineas = doc.splitTextToSize(nombreCompleto, areaTexto.width - 2)
    const numeroLineasNombre = Math.min(nombreLineas.length, 3)  // Permitir hasta 3 líneas para nombres largos
    
    // Calcular altura del nombre
    const alturaNombre = numeroLineasNombre * (nombreFontSize * 0.352778)
    
    // Preparar información del cargo - TAMAÑO FIJO
    let alturaCargoTotal = 0
    const cargoFontSize = 18  // Tamaño fijo para modalidad/cargo (menor que el nombre)
    let cargoLineas = []
    
    if (asistente.cargo && asistente.cargo.trim() !== '') {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(cargoFontSize)
      
      cargoLineas = doc.splitTextToSize(asistente.cargo, areaTexto.width - 2)
      // Calcular altura considerando todas las líneas del cargo
      alturaCargoTotal = (cargoLineas.length * cargoFontSize * 0.352778 * 0.9) + 0.5  // Espaciado ultra mínimo entre nombre y cargo
    }
    
    // Calcular posición vertical centrada en el área + 0.7cm más abajo - 0.5cm más arriba - un poquito más arriba
    const alturaContenidoTotal = alturaNombre + alturaCargoTotal
    const centroVertical = areaTexto.y + (areaTexto.height / 2)
    let currentY = centroVertical - (alturaContenidoTotal / 2) + (nombreFontSize * 0.352778 * 0.7) + 7 - 5 - 3  // +7mm abajo -5mm arriba -3mm más arriba
    
    // Dibujar nombre
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(nombreFontSize)
    
    for (let i = 0; i < numeroLineasNombre; i++) {
      doc.text(nombreLineas[i], centroHorizontal, currentY, { align: 'center' })
      currentY += nombreFontSize * 0.352778 * 0.9
    }

    // Dibujar cargo (todas las líneas)
    if (asistente.cargo && asistente.cargo.trim() !== '' && cargoLineas.length > 0) {
      currentY += 0.5  // Separación ultra mínima entre nombre y cargo
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(cargoFontSize)
      
      // Dibujar todas las líneas del cargo
      for (let i = 0; i < cargoLineas.length; i++) {
        doc.text(cargoLineas[i], centroHorizontal, currentY, { align: 'center' })
        currentY += cargoFontSize * 0.352778 * 0.9  // Espaciado entre líneas
      }
    }
  }

  // Generar una escarapela por página
  asistentes.forEach((asistente, index) => {
    if (index > 0) {
      doc.addPage([escarapelaWidth, escarapelaHeight])
    }
    
    dibujarTextoEscarapela(asistente)
  })

  const pdfBuffer = doc.output('arraybuffer')

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="escarapelas-${new Date().toISOString().split('T')[0]}.pdf"`
    }
  })
}

// Función para generar PDF en modo matriz (múltiples escarapelas en A4)
async function generarPDFMatriz(asistentes: Asistente[], opciones?: EscarapelaOptions) {
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

  // Limpiar metadatos para evitar información automática
  doc.setProperties({
    title: '',
    subject: '',
    author: '',
    keywords: '',
    creator: ''
  })


    // Función para dibujar una escarapela
    const dibujarEscarapela = (asistente: Asistente, x: number, y: number) => {
    // Área completa disponible con padding mínimo
    const padding = 0.5
      const innerX = x + padding
      const innerY = y + padding
      const innerWidth = escarapelaWidth - (padding * 2)
      const innerHeight = escarapelaHeight - (padding * 2)

    // Calcular el centro horizontal del área
    const centroHorizontal = x + (escarapelaWidth / 2)

    // NOMBRE DEL ASISTENTE - TAMAÑO FIJO
      doc.setFont('helvetica', 'bold')
      
    // Tamaño fijo para nombres en modo matriz
    const nombreFontSize = 16  // Tamaño fijo apropiado para matriz
      const nombreCompleto = asistente.nombre
    
    doc.setFontSize(nombreFontSize)
    
    // Dividir nombre en líneas si es necesario
    const nombreLineas = doc.splitTextToSize(nombreCompleto, innerWidth - 1)
    const numeroLineasNombre = Math.min(nombreLineas.length, 2)
    
    // Calcular altura del nombre en mm
    const alturaNombre = numeroLineasNombre * (nombreFontSize * 0.352778)
    
    // Preparar información del cargo - TAMAÑO FIJO
    let alturaCargoTotal = 0
    const cargoFontSize = 12  // Tamaño fijo para cargo en modo matriz
    let cargoLineas = []
    
    if (asistente.cargo && asistente.cargo.trim() !== '') {
        doc.setFont('helvetica', 'normal')
      doc.setFontSize(cargoFontSize)
      
      cargoLineas = doc.splitTextToSize(asistente.cargo, innerWidth - 1)
      // Calcular altura considerando todas las líneas del cargo
      alturaCargoTotal = (cargoLineas.length * cargoFontSize * 0.352778 * 0.9) + 3
    }
    
    // Calcular la altura total del contenido
    const alturaContenidoTotal = alturaNombre + alturaCargoTotal
    
    // Calcular posición Y inicial para centrar todo el contenido
    const centroVertical = y + (escarapelaHeight / 2)
    let currentY = centroVertical - (alturaContenidoTotal / 2) + (nombreFontSize * 0.352778 * 0.7)
    
    // Configurar la fuente del nombre
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(nombreFontSize)
    
    // Dibujar líneas del nombre (CENTRADAS HORIZONTALMENTE)
    for (let i = 0; i < numeroLineasNombre; i++) {
      doc.text(nombreLineas[i], centroHorizontal, currentY, { align: 'center' })
      currentY += nombreFontSize * 0.352778 * 0.9
      }

    // CARGO (si existe) - CENTRADO HORIZONTALMENTE (todas las líneas)
    if (asistente.cargo && asistente.cargo.trim() !== '' && cargoLineas.length > 0) {
      currentY += 3
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(cargoFontSize)
      
      // Dibujar todas las líneas del cargo
      for (let i = 0; i < cargoLineas.length; i++) {
        doc.text(cargoLineas[i], centroHorizontal, currentY, { align: 'center' })
        currentY += cargoFontSize * 0.352778 * 0.9  // Espaciado entre líneas
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

    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="escarapelas-matriz-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })
} 