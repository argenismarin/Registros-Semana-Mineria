const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Configurando HTTPS local para desarrollo...\n');

try {
  // Verificar si mkcert está instalado
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    console.log('✅ mkcert ya está instalado');
  } catch (error) {
    console.log('📦 Instalando mkcert...');
    
    // Detectar sistema operativo e instalar mkcert
    const platform = process.platform;
    
    if (platform === 'win32') {
      console.log('🪟 Detectado Windows. Instalando mkcert...');
      try {
        // Intentar con Chocolatey primero
        execSync('choco install mkcert', { stdio: 'inherit' });
      } catch (chocoError) {
        try {
          // Intentar con Scoop
          execSync('scoop install mkcert', { stdio: 'inherit' });
        } catch (scoopError) {
          console.log('❌ No se pudo instalar mkcert automáticamente.');
          console.log('Por favor instala mkcert manualmente:');
          console.log('1. Instala Chocolatey: https://chocolatey.org/install');
          console.log('2. Ejecuta: choco install mkcert');
          console.log('3. O descarga desde: https://github.com/FiloSottile/mkcert/releases');
          process.exit(1);
        }
      }
    } else if (platform === 'darwin') {
      console.log('🍎 Detectado macOS. Instalando mkcert con Homebrew...');
      execSync('brew install mkcert', { stdio: 'inherit' });
    } else {
      console.log('🐧 Detectado Linux. Instalando mkcert...');
      // Para Ubuntu/Debian
      try {
        execSync('sudo apt install libnss3-tools', { stdio: 'inherit' });
        execSync('curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"', { stdio: 'inherit' });
        execSync('chmod +x mkcert-v*-linux-amd64', { stdio: 'inherit' });
        execSync('sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert', { stdio: 'inherit' });
      } catch (linuxError) {
        console.log('❌ Error instalando en Linux. Instala mkcert manualmente.');
        process.exit(1);
      }
    }
  }

  // Instalar CA local
  console.log('🔐 Instalando Certificate Authority local...');
  execSync('mkcert -install', { stdio: 'inherit' });

  // Crear certificados para localhost
  console.log('📜 Generando certificados SSL para localhost...');
  execSync('mkcert localhost 127.0.0.1 ::1', { stdio: 'inherit' });

  // Verificar que los archivos se crearon
  const certFile = 'localhost.pem';
  const keyFile = 'localhost-key.pem';

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('✅ Certificados SSL generados exitosamente!');
    console.log(`📄 Certificado: ${certFile}`);
    console.log(`🔑 Clave privada: ${keyFile}`);
  } else {
    throw new Error('No se pudieron generar los certificados');
  }

  // Crear archivo .gitignore para los certificados si no existe
  const gitignorePath = '.gitignore';
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  if (!gitignoreContent.includes('localhost.pem')) {
    const certEntries = '\n# Certificados SSL locales\nlocalhost.pem\nlocalhost-key.pem\n';
    fs.appendFileSync(gitignorePath, certEntries);
    console.log('📝 Agregado certificados al .gitignore');
  }

  console.log('\n🎉 ¡HTTPS configurado exitosamente!');
  console.log('\n📱 Para usar la cámara en móviles:');
  console.log('1. Ejecuta: npm run dev:https');
  console.log('2. Accede desde móvil: https://TU_IP_LOCAL:3001');
  console.log('3. Acepta el certificado en el navegador');
  console.log('\n💡 Encuentra tu IP local con: ipconfig (Windows) o ifconfig (Mac/Linux)');

} catch (error) {
  console.error('❌ Error configurando HTTPS:', error.message);
  console.log('\n🛠️  Solución manual:');
  console.log('1. Instala mkcert: https://github.com/FiloSottile/mkcert');
  console.log('2. Ejecuta: mkcert -install');
  console.log('3. Ejecuta: mkcert localhost 127.0.0.1 ::1');
  process.exit(1);
} 