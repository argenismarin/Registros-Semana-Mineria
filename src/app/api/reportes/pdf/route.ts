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
  
  // Área de texto optimizada para usar máximo espacio disponible
  const areaTexto = {
    x: 8,         // 0.8cm desde la izquierda (margen mínimo)
    y: 30,        // 3cm desde arriba 
    width: 82,    // 8.2cm de ancho (máximo aprovechamiento)
    height: 70    // 7cm de altura (máximo aprovechamiento)
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
    
    // NOMBRE DEL ASISTENTE
    doc.setFont('helvetica', 'bold')
    
    // Tamaño de fuente base optimizado para el área disponible
    let nombreFontSize = 32  // Tamaño base más grande para usar el espacio
    const nombreCompleto = asistente.nombre
    
    doc.setFontSize(nombreFontSize)
    while (doc.getTextWidth(nombreCompleto) > areaTexto.width - 4 && nombreFontSize > 12) {
      nombreFontSize -= 0.5
      doc.setFontSize(nombreFontSize)
    }
    
    // Dividir nombre en líneas si es necesario
    const nombreLineas = doc.splitTextToSize(nombreCompleto, areaTexto.width - 4)
    const numeroLineasNombre = Math.min(nombreLineas.length, 3)  // Permitir hasta 3 líneas para nombres largos
    
    // Calcular altura del nombre
    const alturaNombre = numeroLineasNombre * (nombreFontSize * 0.352778)
    
    // Preparar información del cargo
    let alturaCargoTotal = 0
    let cargoFontSize = 0
    let cargoLineas = []
    
    if (asistente.cargo && asistente.cargo.trim() !== '') {
      doc.setFont('helvetica', 'normal')
      cargoFontSize = 22  // Tamaño base más grande para el cargo
      
      doc.setFontSize(cargoFontSize)
      while (doc.getTextWidth(asistente.cargo) > areaTexto.width - 4 && cargoFontSize > 8) {
        cargoFontSize -= 0.5
        doc.setFontSize(cargoFontSize)
      }
      
      cargoLineas = doc.splitTextToSize(asistente.cargo, areaTexto.width - 4)
      alturaCargoTotal = cargoFontSize * 0.352778 + 8  // Más espaciado entre nombre y cargo
    }
    
    // Calcular posición vertical centrada en el área
    const alturaContenidoTotal = alturaNombre + alturaCargoTotal
    const centroVertical = areaTexto.y + (areaTexto.height / 2)
    let currentY = centroVertical - (alturaContenidoTotal / 2) + (nombreFontSize * 0.352778 * 0.7)
    
    // Dibujar nombre
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(nombreFontSize)
    
    for (let i = 0; i < numeroLineasNombre; i++) {
      doc.text(nombreLineas[i], centroHorizontal, currentY, { align: 'center' })
      currentY += nombreFontSize * 0.352778 * 0.9
    }

    // Dibujar cargo
    if (asistente.cargo && asistente.cargo.trim() !== '' && cargoLineas.length > 0) {
      currentY += 8  // Mayor separación entre nombre y cargo
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(cargoFontSize)
      
      doc.text(cargoLineas[0], centroHorizontal, currentY, { align: 'center' })
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
    
    // Calcular altura del nombre en mm
    const alturaNombre = numeroLineasNombre * (nombreFontSize * 0.352778)
    
    // Preparar información del cargo
    let alturaCargoTotal = 0
    let cargoFontSize = 0
    let cargoLineas = []
    
    if (asistente.cargo && asistente.cargo.trim() !== '') {
      doc.setFont('helvetica', 'normal')
      cargoFontSize = 18
      
      // Ajustar tamaño de fuente del cargo
      doc.setFontSize(cargoFontSize)
      while (doc.getTextWidth(asistente.cargo) > innerWidth - 1 && cargoFontSize > 8) {
        cargoFontSize -= 0.5
        doc.setFontSize(cargoFontSize)
      }
      
      cargoLineas = doc.splitTextToSize(asistente.cargo, innerWidth - 1)
      alturaCargoTotal = cargoFontSize * 0.352778 + 3
    }
    
    // Calcular la altura total del contenido
    const alturaContenidoTotal = alturaNombre + alturaCargoTotal
    
    // Calcular posición Y inicial para centrar todo el contenido
    const centroVertical = y + (escarapelaHeight / 2)
    let currentY = centroVertical - (alturaContenidoTotal / 2) + (nombreFontSize * 0.352778 * 0.7)
    
    // Volver a configurar la fuente del nombre
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(nombreFontSize)
    
    // Dibujar líneas del nombre (CENTRADAS HORIZONTALMENTE)
    for (let i = 0; i < numeroLineasNombre; i++) {
      doc.text(nombreLineas[i], centroHorizontal, currentY, { align: 'center' })
      currentY += nombreFontSize * 0.352778 * 0.9
    }

    // CARGO (si existe) - CENTRADO HORIZONTALMENTE
    if (asistente.cargo && asistente.cargo.trim() !== '' && cargoLineas.length > 0) {
      currentY += 3
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(cargoFontSize)
      
      doc.text(cargoLineas[0], centroHorizontal, currentY, { align: 'center' })
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