const { io } = require('socket.io-client');

// Configuración
const SERVER_URL = 'http://localhost:3000';
const TEST_DURATION = 30000; // 30 segundos

console.log('🧪 Iniciando prueba del sistema de tiempo real...\n');

// Conectar cliente de prueba
const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
});

let eventosRecibidos = 0;

socket.on('connect', () => {
  console.log('✅ Conectado al servidor Socket.io');
  console.log(`📡 ID del cliente: ${socket.id}\n`);
  
  console.log('📋 Escuchando eventos en tiempo real...');
  console.log('   - nuevo-asistente');
  console.log('   - asistencia-marcada');
  console.log('   - qr-escaneado');
  console.log('   - escarapela-impresa');
  console.log('   - clientes-conectados\n');
  
  // Programar desconexión después del tiempo de prueba
  setTimeout(() => {
    console.log(`\n⏰ Tiempo de prueba completado (${TEST_DURATION/1000}s)`);
    console.log(`📊 Total de eventos recibidos: ${eventosRecibidos}`);
    socket.disconnect();
    process.exit(0);
  }, TEST_DURATION);
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado del servidor');
});

socket.on('reconnect', () => {
  console.log('🔄 Reconectado al servidor');
});

// Escuchar eventos de tiempo real
socket.on('nuevo-asistente', (data) => {
  eventosRecibidos++;
  console.log(`🆕 NUEVO ASISTENTE: ${data.nombre}`);
  console.log(`   📧 Email: ${data.email || 'No especificado'}`);
  console.log(`   💼 Cargo: ${data.cargo || 'No especificado'}`);
  console.log(`   🏢 Empresa: ${data.empresa || 'No especificado'}`);
  console.log(`   🕒 Registrado: ${new Date(data.fechaRegistro).toLocaleString()}\n`);
});

socket.on('asistencia-marcada', (data) => {
  eventosRecibidos++;
  console.log(`✅ ASISTENCIA MARCADA: ${data.asistente.nombre}`);
  console.log(`   📱 Dispositivo: ${data.device}`);
  console.log(`   🕒 Hora llegada: ${new Date(data.asistente.horaLlegada).toLocaleString()}\n`);
});

socket.on('qr-escaneado', (data) => {
  eventosRecibidos++;
  console.log(`📱 QR ESCANEADO: ${data.asistente.nombre}`);
  console.log(`   📱 Dispositivo: ${data.device}`);
  console.log(`   🕒 Hora llegada: ${new Date(data.asistente.horaLlegada).toLocaleString()}\n`);
});

socket.on('escarapela-impresa', (data) => {
  eventosRecibidos++;
  console.log(`🖨️ ESCARAPELA IMPRESA: ${data.nombre}`);
  console.log(`   🆔 ID: ${data.id}\n`);
});

socket.on('clientes-conectados', (count) => {
  console.log(`👥 Clientes conectados: ${count}`);
});

// Manejar errores
socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error.message);
});

// Simular eventos de prueba (opcional)
socket.on('connect', () => {
  console.log('💡 Para probar el sistema:');
  console.log('   1. Abre el navegador en http://localhost:3000');
  console.log('   2. Registra un nuevo asistente');
  console.log('   3. Marca asistencia manualmente');
  console.log('   4. Escanea un código QR');
  console.log('   5. Imprime una escarapela');
  console.log('   6. Observa los eventos en tiempo real aquí\n');
});

// Manejar cierre de la aplicación
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando conexión...');
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando conexión...');
  socket.disconnect();
  process.exit(0);
}); 