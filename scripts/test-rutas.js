const http = require('http');

const rutas = [
  { path: '/', nombre: 'Página Principal' },
  { path: '/test-qr-scanner', nombre: 'Página de Pruebas QR' },
  { path: '/api/asistentes', nombre: 'API Asistentes' }
];

console.log('🧪 Probando rutas de la aplicación...\n');

async function probarRuta(path, nombre) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${nombre}: OK (${res.statusCode})`);
          
          // Mostrar información adicional para APIs
          if (path.includes('/api/')) {
            try {
              const json = JSON.parse(data);
              if (Array.isArray(json)) {
                console.log(`   📊 ${json.length} elementos en respuesta`);
              } else {
                console.log(`   📄 Tipo: ${typeof json}`);
              }
            } catch (e) {
              console.log(`   📄 Tamaño: ${data.length} bytes`);
            }
          } else {
            console.log(`   📄 Tamaño: ${data.length} bytes`);
          }
        } else {
          console.log(`❌ ${nombre}: Error ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${nombre}: ${err.message}`);
      resolve();
    });

    req.on('timeout', () => {
      console.log(`⏰ ${nombre}: Timeout`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function probarTodasLasRutas() {
  for (const ruta of rutas) {
    await probarRuta(ruta.path, ruta.nombre);
  }
  
  console.log('\n🎯 Resumen:');
  console.log('- Si todas las rutas muestran ✅ OK, la aplicación está funcionando');
  console.log('- Si hay errores ❌, revisa los logs del servidor con: npm run dev');
  console.log('- Accede a: http://localhost:3000/test-qr-scanner para probar');
}

probarTodasLasRutas().catch(console.error); 