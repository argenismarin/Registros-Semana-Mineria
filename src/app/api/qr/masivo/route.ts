import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
}

interface OpcionesQR {
  formatoImpresion: 'stickers' | 'tarjetas' | 'badges' | 'custom'
  tamanoQR: 'pequeno' | 'mediano' | 'grande'
  incluyeNombre: boolean
  incluyeEmpresa: boolean
  incluyeCargo: boolean
  copiasPorasistente: number
  columnas: number
  filas: number
}

export async function POST(request: NextRequest) {
  try {
    const { asistentes, opciones }: { asistentes: Asistente[], opciones: OpcionesQR } = await request.json()

    if (!asistentes || asistentes.length === 0) {
      return NextResponse.json({ error: 'No hay asistentes para generar QR' }, { status: 400 })
    }

    // Configuración de tamaños según el formato
    const configuraciones = {
      stickers: {
        ancho: 50, // mm
        alto: 50,
        qrSize: { pequeno: 20, mediano: 25, grande: 30 },
        margen: 5,
        fontSizeNombre: 8,
        fontSizeInfo: 6
      },
      tarjetas: {
        ancho: 85, // mm (tarjeta de visita)
        alto: 55,
        qrSize: { pequeno: 25, mediano: 30, grande: 35 },
        margen: 8,
        fontSizeNombre: 10,
        fontSizeInfo: 8
      },
      badges: {
        ancho: 100, // mm
        alto: 70,
        qrSize: { pequeno: 30, mediano: 40, grande: 50 },
        margen: 10,
        fontSizeNombre: 12,
        fontSizeInfo: 10
      },
      custom: {
        ancho: 70,
        alto: 50,
        qrSize: { pequeno: 20, mediano: 25, grande: 30 },
        margen: 5,
        fontSizeNombre: 9,
        fontSizeInfo: 7
      }
    }

    const config = configuraciones[opciones.formatoImpresion]
    const qrSize = config.qrSize[opciones.tamanoQR]

    // Crear PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const marginX = 10
    const marginY = 10

    // Calcular dimensiones disponibles
    const availableWidth = pageWidth - (marginX * 2)
    const availableHeight = pageHeight - (marginY * 2)

    // Calcular espaciado
    const spacingX = availableWidth / opciones.columnas
    const spacingY = availableHeight / opciones.filas

    let currentX = marginX
    let currentY = marginY
    let itemsEnPagina = 0
    const itemsPorPagina = opciones.columnas * opciones.filas

    // Generar todas las instancias (considerando copias)
    const instancias: Asistente[] = []
    asistentes.forEach(asistente => {
      for (let i = 0; i < opciones.copiasPorasistente; i++) {
        instancias.push(asistente)
      }
    })

    // Procesar cada instancia
    for (let index = 0; index < instancias.length; index++) {
      const asistente = instancias[index]

      // Nueva página si es necesario
      if (itemsEnPagina >= itemsPorPagina && index > 0) {
        doc.addPage()
        currentX = marginX
        currentY = marginY
        itemsEnPagina = 0
      }

      try {
        // Generar QR code como data URL
        const qrData = JSON.stringify({
          id: asistente.id,
          nombre: asistente.nombre,
          tipo: 'asistente'
        })

        const qrDataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })

        // Posición del QR en la página
        const itemX = currentX + (itemsEnPagina % opciones.columnas) * spacingX
        const itemY = currentY + Math.floor(itemsEnPagina / opciones.columnas) * spacingY

        // Dibujar borde del item (opcional)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.rect(itemX, itemY, config.ancho, config.alto)

        // Posición del QR dentro del item
        const qrX = itemX + (config.ancho - qrSize) / 2
        const qrY = itemY + config.margen

        // Agregar código QR
        doc.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize)

        // Agregar información de texto
        let textY = qrY + qrSize + 5

        if (opciones.incluyeNombre) {
          doc.setFontSize(config.fontSizeNombre)
          doc.setFont('helvetica', 'bold')
          
          // Truncar nombre si es muy largo
          let nombreMostrar = asistente.nombre
          if (nombreMostrar.length > 20) {
            nombreMostrar = nombreMostrar.substring(0, 17) + '...'
          }
          
          const textWidth = doc.getTextWidth(nombreMostrar)
          const textX = itemX + (config.ancho - textWidth) / 2
          
          doc.text(nombreMostrar, textX, textY)
          textY += 4
        }

        if (opciones.incluyeEmpresa && asistente.empresa) {
          doc.setFontSize(config.fontSizeInfo)
          doc.setFont('helvetica', 'normal')
          
          let empresaMostrar = asistente.empresa
          if (empresaMostrar.length > 25) {
            empresaMostrar = empresaMostrar.substring(0, 22) + '...'
          }
          
          const textWidth = doc.getTextWidth(empresaMostrar)
          const textX = itemX + (config.ancho - textWidth) / 2
          
          doc.text(empresaMostrar, textX, textY)
          textY += 3
        }

        if (opciones.incluyeCargo && asistente.cargo) {
          doc.setFontSize(config.fontSizeInfo)
          doc.setFont('helvetica', 'normal')
          
          let cargoMostrar = asistente.cargo
          if (cargoMostrar.length > 25) {
            cargoMostrar = cargoMostrar.substring(0, 22) + '...'
          }
          
          const textWidth = doc.getTextWidth(cargoMostrar)
          const textX = itemX + (config.ancho - textWidth) / 2
          
          doc.text(cargoMostrar, textX, textY)
        }

        itemsEnPagina++

      } catch (error) {
        console.error(`Error generando QR para ${asistente.nombre}:`, error)
        continue
      }
    }

    // Agregar información de pie de página
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      // Información del documento
      const info = `Códigos QR - ${asistentes.length} asistentes - ${instancias.length} códigos - Página ${i}/${totalPages}`
      doc.text(info, pageWidth / 2, pageHeight - 5, { align: 'center' })
      
      // Fecha de generación
      const fecha = new Date().toLocaleString('es-ES')
      doc.text(`Generado: ${fecha}`, marginX, pageHeight - 5)
    }

    // Generar buffer
    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="codigos-qr-masivo-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error generando QR masivo:', error)
    return NextResponse.json(
      { error: 'Error generando códigos QR masivos' },
      { status: 500 }
    )
  }
} 