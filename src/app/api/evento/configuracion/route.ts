import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface ConfiguracionEvento {
  nombre: string
  descripcion: string
  fecha: string
  horaInicio: string
  horaFin: string
  ubicacion: string
  organizador: string
  contacto: string
  logoUrl: string
  colorPrimario: string
  colorSecundario: string
  mostrarEscarapelas: boolean
  mostrarQR: boolean
  requerirEmail: boolean
  requerirCargo: boolean
  requerirEmpresa: boolean
  mensajeBienvenida: string
  redesSociales: {
    facebook: string
    twitter: string
    instagram: string
    linkedin: string
  }
}

const configPath = path.join(process.cwd(), 'evento-config.json')

const configuracionDefault: ConfiguracionEvento = {
  nombre: 'Semana de la Minería',
  descripcion: 'Evento académico sobre innovación en minería',
  fecha: new Date().toISOString().split('T')[0],
  horaInicio: '08:00',
  horaFin: '18:00',
  ubicacion: 'Universidad Nacional de Colombia',
  organizador: 'Facultad de Minas',
  contacto: 'eventos@unal.edu.co',
  logoUrl: '',
  colorPrimario: '#1e40af',
  colorSecundario: '#3b82f6',
  mostrarEscarapelas: true,
  mostrarQR: true,
  requerirEmail: false,
  requerirCargo: false,
  requerirEmpresa: false,
  mensajeBienvenida: '¡Bienvenido al evento! Por favor registra tu asistencia.',
  redesSociales: {
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: ''
  }
}

export async function GET() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configData)
      return NextResponse.json(config)
    } else {
      return NextResponse.json(configuracionDefault)
    }
  } catch (error) {
    console.error('Error leyendo configuración:', error)
    return NextResponse.json(configuracionDefault)
  }
}

export async function POST(request: NextRequest) {
  try {
    const config: ConfiguracionEvento = await request.json()
    
    // Validaciones básicas
    if (!config.nombre || config.nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del evento es requerido' },
        { status: 400 }
      )
    }

    if (!config.fecha) {
      return NextResponse.json(
        { error: 'La fecha del evento es requerida' },
        { status: 400 }
      )
    }

    // Validar colores (formato hex)
    const colorRegex = /^#[0-9A-F]{6}$/i
    if (!colorRegex.test(config.colorPrimario)) {
      return NextResponse.json(
        { error: 'Color primario inválido' },
        { status: 400 }
      )
    }

    if (!colorRegex.test(config.colorSecundario)) {
      return NextResponse.json(
        { error: 'Color secundario inválido' },
        { status: 400 }
      )
    }

    // Validar email de contacto si se proporciona
    if (config.contacto && config.contacto.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(config.contacto)) {
        return NextResponse.json(
          { error: 'Email de contacto inválido' },
          { status: 400 }
        )
      }
    }

    // Guardar configuración
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Notificar cambios a clientes conectados
    try {
      await fetch(`${request.nextUrl.origin}/api/socket.io`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'configuracion-actualizada',
          data: {
            mensaje: 'Configuración del evento actualizada',
            evento: config.nombre
          }
        })
      })
    } catch (error) {
      console.error('Error notificando configuración:', error)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración guardada exitosamente' 
    })

  } catch (error) {
    console.error('Error guardando configuración:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 