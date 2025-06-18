import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  
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

    // Crear archivo temporal
    const timestamp = Date.now()
    const fileName = `qr_masivo_${timestamp}.pdf`
    tempFilePath = join(tmpdir(), fileName)

    // Convertir blob a buffer y guardar archivo
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    writeFileSync(tempFilePath, buffer)

    // Detectar SO y usar comando apropiado
    const platform = process.platform
    let comando: string

    if (platform === 'win32') {
      // Windows: usar powershell para imprimir
      comando = `powershell -Command "Start-Process -FilePath '${tempFilePath}' -Verb Print -ArgumentList '/p:\"${nombreImpresora}\"'"`
    } else if (platform === 'darwin') {
      // macOS: usar lpr
      comando = `lpr -P "${nombreImpresora}" "${tempFilePath}"`
    } else {
      // Linux: usar lpr
      comando = `lpr -P "${nombreImpresora}" "${tempFilePath}"`
    }

    try {
      await execAsync(comando)
      
      return NextResponse.json({
        success: true,
        mensaje: `PDF enviado a impresora: ${nombreImpresora}`,
        archivo: fileName,
        platform
      })

    } catch (printError) {
      console.error('Error imprimiendo:', printError)
      
      // Intentar método alternativo en Windows
      if (platform === 'win32') {
        try {
          const comandoAlt = `powershell -Command "& {Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms; $proc = New-Object System.Diagnostics.ProcessStartInfo; $proc.FileName = '${tempFilePath}'; $proc.Verb = 'print'; [System.Diagnostics.Process]::Start($proc)}"`
          await execAsync(comandoAlt)
          
          return NextResponse.json({
            success: true,
            mensaje: `PDF enviado a impresora predeterminada (método alternativo)`,
            archivo: fileName,
            platform,
            metodo: 'alternativo'
          })
        } catch (altError) {
          throw printError // Usar el error original
        }
      } else {
        throw printError
      }
    }

  } catch (error) {
    console.error('Error general en impresión:', error)
    
    return NextResponse.json({
      error: 'Error enviando a impresora',
      detalles: error instanceof Error ? error.message : 'Error desconocido',
      sugerencia: 'Verifica que la impresora esté disponible y los controladores instalados'
    }, { status: 500 })

  } finally {
    // Limpiar archivo temporal
    if (tempFilePath) {
      try {
        setTimeout(() => {
          try {
            unlinkSync(tempFilePath!)
          } catch (unlinkError) {
            console.error('Error eliminando archivo temporal:', unlinkError)
          }
        }, 5000) // Esperar 5 segundos antes de eliminar
      } catch (cleanupError) {
        console.error('Error programando limpieza:', cleanupError)
      }
    }
  }
} 