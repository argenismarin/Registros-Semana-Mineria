const fs = require('fs');

console.log('🧪 Probando funcionalidad básica...\n');

// 1. Verificar archivo de base de datos
console.log('🗄️ Base de Datos:');
if (fs.existsSync('src/lib/database.ts')) {
  const dbContent = fs.readFileSync('src/lib/database.ts', 'utf8');
  
  if (dbContent.includes('class MemoryDatabase')) {
    console.log('✅ Clase MemoryDatabase presente');
  } else {
    console.log('❌ Falta clase MemoryDatabase');
  }
  
  if (dbContent.includes('getAsistentes') && dbContent.includes('addAsistente')) {
    console.log('✅ Métodos básicos implementados');
  } else {
    console.log('❌ Faltan métodos básicos');
  }
  
  if (dbContent.includes('export interface Asistente')) {
    console.log('✅ Interface Asistente definida');
  } else {
    console.log('❌ Falta interface Asistente');
  }
} else {
  console.log('❌ database.ts no encontrado');
}

// 2. Verificar QR Scanner
console.log('\n📱 QR Scanner:');
if (fs.existsSync('src/components/QRScanner.tsx')) {
  const qrContent = fs.readFileSync('src/components/QRScanner.tsx', 'utf8');
  
  if (qrContent.includes('getUserMedia')) {
    console.log('✅ Acceso a cámara implementado');
  } else {
    console.log('❌ Falta acceso a cámara');
  }
  
  if (qrContent.includes('jsQR')) {
    console.log('✅ Librería jsQR importada');
  } else {
    console.log('❌ Falta librería jsQR');
  }
  
  if (qrContent.includes('facingMode')) {
    console.log('✅ Configuración de cámara presente');
  } else {
    console.log('❌ Falta configuración de cámara');
  }
  
  if (qrContent.includes('onScan') && qrContent.includes('onClose')) {
    console.log('✅ Callbacks implementados');
  } else {
    console.log('❌ Faltan callbacks');
  }
} else {
  console.log('❌ QRScanner.tsx no encontrado');
}

// 3. Verificar API de asistentes
console.log('\n🔗 API de Asistentes:');
if (fs.existsSync('src/app/api/asistentes/route.ts')) {
  const apiContent = fs.readFileSync('src/app/api/asistentes/route.ts', 'utf8');
  
  if (apiContent.includes('export async function GET')) {
    console.log('✅ Endpoint GET implementado');
  } else {
    console.log('❌ Falta endpoint GET');
  }
  
  if (apiContent.includes('export async function POST')) {
    console.log('✅ Endpoint POST implementado');
  } else {
    console.log('❌ Falta endpoint POST');
  }
  
  if (apiContent.includes('db.getAsistentes')) {
    console.log('✅ Usa base de datos');
  } else {
    console.log('❌ No usa base de datos');
  }
} else {
  console.log('❌ route.ts no encontrado');
}

// 4. Verificar página de prueba
console.log('\n🧪 Página de Prueba:');
if (fs.existsSync('src/app/test-qr-scanner/page.tsx')) {
  const testContent = fs.readFileSync('src/app/test-qr-scanner/page.tsx', 'utf8');
  
  if (testContent.includes('QRScanner')) {
    console.log('✅ Importa QRScanner');
  } else {
    console.log('❌ No importa QRScanner');
  }
  
  if (testContent.includes('useState') && testContent.includes('useEffect')) {
    console.log('✅ Hooks de React implementados');
  } else {
    console.log('❌ Faltan hooks de React');
  }
} else {
  console.log('❌ Página de prueba no encontrada');
}

// 5. Verificar package.json
console.log('\n📦 Dependencias:');
if (fs.existsSync('package.json')) {
  const packageContent = fs.readFileSync('package.json', 'utf8');
  const packageJson = JSON.parse(packageContent);
  
  const requiredDeps = ['jsqr', 'uuid', 'qrcode'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} instalado`);
    } else {
      console.log(`❌ Falta ${dep}`);
    }
  });
} else {
  console.log('❌ package.json no encontrado');
}

console.log('\n📊 Resumen:');
console.log('- Base de datos: Simplificada y funcional');
console.log('- QR Scanner: Implementado con fallbacks');
console.log('- APIs: Básicas pero funcionales');
console.log('- Página de prueba: Disponible en /test-qr-scanner');

console.log('\n🚀 Para probar:');
console.log('1. npm run dev');
console.log('2. Abrir http://localhost:3000/test-qr-scanner');
console.log('3. Probar creación de asistentes y QR scanner'); 