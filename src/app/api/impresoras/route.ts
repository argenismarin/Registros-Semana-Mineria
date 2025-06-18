import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // En entorno serverless (como Vercel), no podemos acceder a impresoras del sistema
    // Devolvemos impresoras comunes/virtuales disponibles en navegadores
    const impresoras = [
      'Guardar como PDF',
      'Microsoft Print to PDF', 
      'Imprimir en navegador',
      'HP LaserJet (Red)',
      'Canon PIXMA (WiFi)',
      'Epson L3150 (USB)',
      'Brother HL-L2320D',
      'Samsung ML-1640'
    ]

    return NextResponse.json({
      impresoras,
      platform: 'serverless',
      detectadas: 'predeterminadas',
      note: 'En entorno serverless se usan impresoras predeterminadas. La impresión real se maneja por el navegador.'
    })

  } catch (error) {
    console.error('Error obteniendo impresoras:', error)
    
    // Fallback mínimo
    return NextResponse.json({
      impresoras: [
        'Guardar como PDF',
        'Imprimir en navegador'
      ],
      platform: 'serverless',
      detectadas: 'fallback',
      error: 'Error al cargar lista de impresoras'
    })
  }
} 