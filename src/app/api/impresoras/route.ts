import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    let impresoras: string[] = []

    // Detectar SO y ejecutar comando apropiado
    const platform = process.platform

    if (platform === 'win32') {
      // Windows: usar wmic
      try {
        const { stdout } = await execAsync('wmic printer get name /format:list')
        impresoras = stdout
          .split('\n')
          .filter(line => line.startsWith('Name='))
          .map(line => line.replace('Name=', '').trim())
          .filter(name => name && name !== '')
      } catch (error) {
        console.error('Error obteniendo impresoras Windows:', error)
      }
    } else if (platform === 'darwin') {
      // macOS: usar lpstat
      try {
        const { stdout } = await execAsync('lpstat -p')
        impresoras = stdout
          .split('\n')
          .filter(line => line.startsWith('printer'))
          .map(line => line.split(' ')[1])
          .filter(name => name)
      } catch (error) {
        console.error('Error obteniendo impresoras macOS:', error)
      }
    } else {
      // Linux: usar lpstat
      try {
        const { stdout } = await execAsync('lpstat -p')
        impresoras = stdout
          .split('\n')
          .filter(line => line.startsWith('printer'))
          .map(line => line.split(' ')[1])
          .filter(name => name)
      } catch (error) {
        console.error('Error obteniendo impresoras Linux:', error)
      }
    }

    // Agregar impresoras comunes si no se detectaron
    if (impresoras.length === 0) {
      impresoras = [
        'Microsoft Print to PDF',
        'Impresora predeterminada',
        'HP LaserJet',
        'Canon PIXMA',
        'Epson L3150'
      ]
    }

    return NextResponse.json({
      impresoras,
      platform,
      detectadas: impresoras.length > 5 ? 'automáticamente' : 'por defecto'
    })

  } catch (error) {
    console.error('Error general obteniendo impresoras:', error)
    
    // Fallback: devolver impresoras comunes
    return NextResponse.json({
      impresoras: [
        'Microsoft Print to PDF',
        'Impresora predeterminada'
      ],
      platform: process.platform,
      detectadas: 'fallback',
      error: 'No se pudieron detectar impresoras automáticamente'
    })
  }
} 