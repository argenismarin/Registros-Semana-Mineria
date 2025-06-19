const fs = require('fs');

console.log('🧪 Prueba de Sincronización con Google Sheets');
console.log('='.repeat(50));

// Verificar variables de entorno
console.log('\n📋 Verificando configuración...');

// Leer .env.local si existe
let envVars = {};
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...value] = line.split('=');
      envVars[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
  console.log('✅ Archivo .env.local encontrado');
} else {
  console.log('❌ Archivo .env.local no encontrado');
}

// Verificar variables críticas
const requiredVars = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEETS_SPREADSHEET_ID'
];

console.log('\n🔍 Variables de entorno:');
requiredVars.forEach(varName => {
  if (envVars[varName]) {
    if (varName === 'GOOGLE_PRIVATE_KEY') {
      console.log(`✅ ${varName}: ***CONFIGURADA***`);
    } else {
      console.log(`✅ ${varName}: ${envVars[varName]}`);
    }
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
  }
});

// Verificar archivos críticos
console.log('\n📁 Verificando archivos...');

const archivosImportantes = [
  'src/lib/googleSheets.ts',
  'src/app/api/asistentes/[id]/asistencia/route.ts',
  'src/app/api/asistentes/[id]/imprimir/route.ts',
  'src/components/QRScanner.tsx'
];

archivosImportantes.forEach(archivo => {
  if (fs.existsSync(archivo)) {
    console.log(`✅ ${archivo}`);
  } else {
    console.log(`❌ ${archivo} - NO ENCONTRADO`);
  }
});

// Verificar sincronización en archivos
console.log('\n🔄 Verificando sincronización en código...');

// Verificar route.ts de asistencia
if (fs.existsSync('src/app/api/asistentes/[id]/asistencia/route.ts')) {
  const asistenciaContent = fs.readFileSync('src/app/api/asistentes/[id]/asistencia/route.ts', 'utf8');
  if (asistenciaContent.includes('googleSheetsService.updateAsistente')) {
    console.log('✅ Asistencia: Sincronización con Google Sheets activada');
  } else {
    console.log('❌ Asistencia: Falta sincronización con Google Sheets');
  }
}

// Verificar route.ts de impresión
if (fs.existsSync('src/app/api/asistentes/[id]/imprimir/route.ts')) {
  const imprimirContent = fs.readFileSync('src/app/api/asistentes/[id]/imprimir/route.ts', 'utf8');
  if (imprimirContent.includes('googleSheetsService.updateAsistente')) {
    console.log('✅ Impresión: Sincronización con Google Sheets activada');
  } else {
    console.log('❌ Impresión: Falta sincronización con Google Sheets');
  }
}

// Verificar QRScanner
if (fs.existsSync('src/components/QRScanner.tsx')) {
  const qrContent = fs.readFileSync('src/components/QRScanner.tsx', 'utf8');
  if (qrContent.includes('facingMode: \'environment\'') && qrContent.includes('facingMode: \'user\'')) {
    console.log('✅ QR Scanner: Fallback de cámara implementado');
  } else {
    console.log('❌ QR Scanner: Falta fallback de cámara');
  }
  
  if (qrContent.includes('animate-pulse')) {
    console.log('✅ QR Scanner: Interfaz mejorada activada');
  } else {
    console.log('❌ QR Scanner: Interfaz básica');
  }
}

console.log('\n📊 Resumen de Estado:');
console.log('==================');

const todoConfigured = requiredVars.every(varName => envVars[varName]);
if (todoConfigured) {
  console.log('🎉 ¡Google Sheets completamente configurado!');
  console.log('📝 Las modificaciones se sincronizarán automáticamente');
} else {
  console.log('⚠️  Google Sheets parcialmente configurado');
  console.log('📝 Los datos se guardarán solo en memoria local');
}

console.log('\n🔗 Enlaces útiles:');
console.log('• Aplicación: http://localhost:3000');
console.log('• Configuración: http://localhost:3000/configuracion');
console.log('• Test QR: http://localhost:3000/test-qr-scanner');

if (envVars.GOOGLE_SHEETS_SPREADSHEET_ID) {
  console.log(`• Google Sheet: https://docs.google.com/spreadsheets/d/${envVars.GOOGLE_SHEETS_SPREADSHEET_ID}/edit`);
}

console.log('\n💡 Para probar:');
console.log('1. Ejecuta: npm run dev');
console.log('2. Registra un nuevo asistente');
console.log('3. Marca su asistencia');
console.log('4. Verifica que aparezca en Google Sheets');
console.log('5. Prueba el escáner QR desde un móvil');

console.log('\n✨ ¡Listo para usar!'); 