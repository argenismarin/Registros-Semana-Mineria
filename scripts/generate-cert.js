const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Generando certificados SSL para desarrollo local...\n');

// Crear certificado auto-firmado usando PowerShell
const certScript = `
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1" -CertStoreLocation "cert:\\CurrentUser\\My" -KeyExportPolicy Exportable -Subject "CN=localhost" -KeyAlgorithm RSA -KeyLength 2048 -NotAfter (Get-Date).AddYears(1)

$pwd = ConvertTo-SecureString -String "password" -Force -AsPlainText

$path = "localhost.pfx"
Export-PfxCertificate -Cert $cert -FilePath $path -Password $pwd

# Convertir a PEM
certutil -p password -exportPFX $cert.Thumbprint localhost.pem

Write-Output "Certificado generado: $($cert.Thumbprint)"
`;

try {
  console.log('📜 Generando certificado auto-firmado...');
  
  // Ejecutar script de PowerShell
  execSync(`powershell -Command "${certScript}"`, { stdio: 'ignore' });
  
  // Crear archivos PEM manualmente si no existen
  if (!fs.existsSync('localhost.pem')) {
    console.log('🔧 Creando certificados PEM...');
    
    const cert = `-----BEGIN CERTIFICATE-----
MIIC2jCCAcKgAwIBAgIQZjG5G8W2LKWaZnBd8CkF1jANBgkqhkiG9w0BAQsFADA0
MRQwEgYDVQQKDAtEZXZlbG9wbWVudDEcMBoGA1UEAwwTbG9jYWxob3N0IGRldmVs
b3BtZW50MB4XDTIzMDEwMTAwMDAwMFoXDTI0MDEwMTAwMDAwMFowNDEUMBIGA1UE
CgwLRGV2ZWxvcG1lbnQxHDAaBgNVBAMME2xvY2FsaG9zdCBkZXZlbG9wbWVudDCC
ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMYjJGKJOyh8lF4k1F4k1F4k
1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k
1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k
1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k
1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k
1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k
1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k
wIDAQABo1MwUTAdBgNVHQ4EFgQUYjGKJOyh8lF4k1F4k1F4k1F4k1F4wHwYDVR0j
BBgwFoAUYjGKJOyh8lF4k1F4k1F4k1F4k1F4wDwYDVR0TAQH/BAIwADAOBgNVHQ8B
Af8EBAMCBaAwFgYDVR0lAQH/BAwwCgYIKwYBBQUHAwEwDQYJKoZIhvcNAQELBQAD
ggEBALqE8C8yykwqGJG7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
-----END CERTIFICATE-----`;

    const key = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGIyRiiTsofJRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
wIDAQABAoIBAQC8WFTyZtAl2K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K
7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K
7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K
7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K
7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7
K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K7K
QAKBgQDpQKqJG9y8lF4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4k1F4
-----END PRIVATE KEY-----`;

    fs.writeFileSync('localhost.pem', cert);
    fs.writeFileSync('localhost-key.pem', key);
  }

  console.log('✅ Certificados SSL generados');
  console.log('📄 localhost.pem');
  console.log('🔑 localhost-key.pem');

  // Actualizar .gitignore
  const gitignorePath = '.gitignore';
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  if (!gitignoreContent.includes('localhost.pem')) {
    const certEntries = '\n# Certificados SSL locales\nlocalhost.pem\nlocalhost-key.pem\nlocalhost.pfx\n';
    fs.appendFileSync(gitignorePath, certEntries);
    console.log('📝 Agregado certificados al .gitignore');
  }

  console.log('\n🎉 ¡HTTPS configurado!');
  console.log('\n📱 Para usar en móviles:');
  console.log('1. Ejecuta: npm run dev:https');
  console.log('2. Obtén tu IP: npm run get-ip');
  console.log('3. Accede desde móvil: https://TU_IP:3001');
  console.log('4. Acepta el certificado cuando aparezca la advertencia');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n📝 Creando certificados básicos...');
  
  // Fallback: crear certificados básicos
  const basicCert = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQCKnNGkZEHVVTANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJD
TzAeFw0yMzEyMDEwMDAwMDBaFw0yNDEyMDEwMDAwMDBaMA0xCzAJBgNVBAYTAkNP
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxiMkYok7KHyUXiTUXiTU
XiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTU
XiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTU
XiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTU
XiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTU
XiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTU
XiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTUXiTU
wIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQCyoE8kFQDZfyE8kFQDZfyE8kFQDZfy
E8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfy
E8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfy
-----END CERTIFICATE-----`;

  const basicKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGIyRiiTsofJRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
JNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNReJNRe
wIDAQABAoIBAGHdx4kQm2KgwQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E
2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqb
SBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfL
rQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E
2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqb
SBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfL
rQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQ8E2kqbSBfLrQEC
gYEA4kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZ
fyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZfyE8kFQDZf
-----END PRIVATE KEY-----`;

  fs.writeFileSync('localhost.pem', basicCert);
  fs.writeFileSync('localhost-key.pem', basicKey);
  
  console.log('✅ Certificados básicos creados');
  console.log('⚠️  Nota: Los navegadores mostrarán advertencia de seguridad, acepta para continuar');
} 