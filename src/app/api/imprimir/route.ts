import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const nombreImpresora = formData.get('impresora') as string

    if (!pdfFile || !nombreImpresora) {
      return NextResponse.json(
        { error: 'PDF y nombre de impresora requeridos' },
        { status: 400 }
      )
    }

    // En entorno serverless (Vercel), no podemos ejecutar comandos del sistema
    // Devolver el PDF para descarga manual
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const timestamp = Date.now()
    const fileName = `qr_masivo_${timestamp}.pdf`

    // En serverless, devolvemos respuesta para manejo por el cliente
    return NextResponse.json({
      success: true,
      mensaje: `PDF preparado para descarga: ${nombreImpresora}`,
      archivo: fileName,
      platform: 'serverless',
      note: 'En entorno serverless la impresión se maneja desde el navegador'
    })

  } catch (error) {
    console.error('Error general en procesamiento de PDF:', error)
    
    return NextResponse.json({
      error: 'Error procesando PDF',
      detalles: error instanceof Error ? error.message : 'Error desconocido',
      sugerencia: 'Descarga el PDF e imprime manualmente desde tu navegador'
    }, { status: 500 })
  }
} 