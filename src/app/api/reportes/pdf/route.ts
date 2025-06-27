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
  modoImpresion?: 'directa'
}

export async function POST(request: NextRequest) {
  try {
    const { asistentes }: { 
      asistentes: Asistente[]
    } = await request.json()

    if (!asistentes || asistentes.length === 0) {
      return NextResponse.json({ error: 'No hay asistentes para generar escarapelas' }, { status: 400 })
    }

    // SIEMPRE usar formato 98mm x 128mm
    return generarPDFEscarapelas(asistentes)

  } catch (error) {
    console.error('Error generando PDF de escarapelas:', error)
    return NextResponse.json(
      { error: 'Error generando PDF de escarapelas' },
      { status: 500 }
    )
  }
}

// Función para generar PDF de escarapelas (ÚNICO FORMATO)
async function generarPDFEscarapelas(asistentes: Asistente[]) {
  // Dimensiones de la escarapela física
  const escarapelaWidth = 98  // mm
  const escarapelaHeight = 128 // mm
  
  // Área de texto según las medidas proporcionadas
  const areaTexto = {
    x: 21,        // 2.1cm desde la izquierda (0.5cm más a la derecha)
    y: 53,        // 5.3cm desde arriba (0.5cm más arriba)
    width: 49,    // desde 2.1cm hasta 7cm = 4.9cm
    height: 49.5  // desde 5.3cm hasta 2.5cm del final = 4.95cm (más espacio)
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
    
    // Ajustar tamaño de fuente para el área disponible (empezamos más grande)
    let nombreFontSize = 20  // Aumentado de 16 a 20
    const nombreCompleto = asistente.nombre
    
    doc.setFontSize(nombreFontSize)
    while (doc.getTextWidth(nombreCompleto) > areaTexto.width - 2 && nombreFontSize > 8) {
      nombreFontSize -= 0.5
      doc.setFontSize(nombreFontSize)
    }
    
    // Dividir nombre en líneas si es necesario
    const nombreLineas = doc.splitTextToSize(nombreCompleto, areaTexto.width - 2)
    const numeroLineasNombre = Math.min(nombreLineas.length, 2)
    
    // Calcular altura del nombre
    const alturaNombre = numeroLineasNombre * (nombreFontSize * 0.352778)
    
    // Preparar información del cargo
    let alturaCargoTotal = 0
    let cargoFontSize = 0
    let cargoLineas = []
    
    if (asistente.cargo && asistente.cargo.trim() !== '') {
      doc.setFont('helvetica', 'normal')
      cargoFontSize = 15  // Aumentado de 12 a 15
      
      doc.setFontSize(cargoFontSize)
      while (doc.getTextWidth(asistente.cargo) > areaTexto.width - 2 && cargoFontSize > 6) {
        cargoFontSize -= 0.5
        doc.setFontSize(cargoFontSize)
      }
      
      cargoLineas = doc.splitTextToSize(asistente.cargo, areaTexto.width - 2)
      alturaCargoTotal = cargoFontSize * 0.352778 + 3
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
      currentY += 3
      
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