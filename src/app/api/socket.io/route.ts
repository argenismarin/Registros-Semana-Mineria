import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

// Almacenar la instancia de socket.io
let io: SocketIOServer | undefined

export async function GET(req: NextRequest) {
  if (!io) {
    // Crear servidor HTTP para socket.io
    const httpServer = new HTTPServer()
    
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    // Contador de clientes conectados
    let clientesConectados = 0

    io.on('connection', (socket) => {
      clientesConectados++
      console.log(`🔗 Cliente conectado: ${socket.id} (Total: ${clientesConectados})`)

      // Notificar a todos los clientes el nuevo contador
      io?.emit('clientes-conectados', clientesConectados)

      // Eventos de asistentes
      socket.on('nuevo-asistente', (data) => {
        console.log('📢 Nuevo asistente broadcast:', data.nombre)
        socket.broadcast.emit('nuevo-asistente', data)
      })

      socket.on('asistente-actualizado', (data) => {
        console.log('📢 Asistente actualizado broadcast:', data.nombre)
        socket.broadcast.emit('asistente-actualizado', data)
      })

      socket.on('asistencia-marcada', (data) => {
        console.log('📢 Asistencia marcada broadcast:', data.asistente.nombre)
        socket.broadcast.emit('asistencia-marcada', data)
      })

      socket.on('qr-escaneado', (data) => {
        console.log('📢 QR escaneado broadcast:', data.asistente.nombre)
        socket.broadcast.emit('qr-escaneado', data)
      })

      socket.on('escarapela-impresa', (data) => {
        console.log('📢 Escarapela impresa broadcast:', data.nombre)
        socket.broadcast.emit('escarapela-impresa', data)
      })

      socket.on('importacion-masiva', (data) => {
        console.log('📢 Importación masiva broadcast:', data.cantidad, 'asistentes')
        socket.broadcast.emit('importacion-masiva', data)
      })

      socket.on('qr-masivo-generado', (data) => {
        console.log('📢 QR masivo generado broadcast:', data.cantidad, 'códigos QR')
        socket.broadcast.emit('qr-masivo-generado', data)
      })

      socket.on('asistente-eliminado', (data) => {
        console.log('📢 Asistente eliminado broadcast:', data.nombre || data.id)
        socket.broadcast.emit('asistente-eliminado', data)
      })

      // Manejo de desconexión
      socket.on('disconnect', () => {
        clientesConectados--
        console.log(`❌ Cliente desconectado: ${socket.id} (Total: ${clientesConectados})`)
        
        // Notificar a todos los clientes el nuevo contador
        io?.emit('clientes-conectados', clientesConectados)
      })
    })

    console.log('🚀 Servidor Socket.io iniciado para tiempo real')
  }

  return new Response('Socket.io server iniciado', { status: 200 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  if (io) {
    console.log(`📡 Broadcasting evento: ${body.event}`)
    io.emit(body.event, body.data)
    
    return new Response(JSON.stringify({ 
      success: true, 
      event: body.event,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ 
    success: false, 
    error: 'Socket.io no inicializado' 
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
} 