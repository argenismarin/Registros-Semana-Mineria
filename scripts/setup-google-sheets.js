const fs = require('fs');
const path = require('path');

console.log('🔗 Configurando Google Sheets...\n');

// Configuración de Google Sheets
const googleSheetsConfig = {
  serviceAccountEmail: 'registro-eventos-service@registro-cobre.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCRp2jE+cTxpcf6
ugxjZE+OVj5LvFjtkyha+hYU9movw8Xw8fjEnH+5Q+ZpHGe3oc5D3od5+4wxHtOa
HEWOh6d1qypHzFxjwABS1JqXYTsul3whgyFcM284/AuqooMwWsOua8Vz6Zy7MPMa
iikh6ItRaDxbwNMv3oDpNXHYD3cIVyufnBRM+WIKxhhcAi2Trsp2aWLUa0FJuMid
1pRpsgVrGK+IObGAEb3Tch36g2lbBM29ne331M6eXtd/TtcpLgjENArEe1f4NQup
1ZLbSTgTkNQ5pDKBgNX451+DQ2UhplNL0MZc/66jNkAoXO1rqzoOY6PZoe/WwpBf
guBu9ccVAgMBAAECggEABG6pOZ4PvnpY5XBshXvDqTITqQW9JdTQ3HZFKycieeI4
73xiVK1RSUesYJRDAOuiFYU7u/XWwTBODrlmHnbsHO1z/Ti8f2aUCL4I5ESXr4yT
J1WDs6tD0UkBaK357jdDQoprn3uptgKNa0g7OMzVEuM1CJlYc9nCZ3y/KNMaDRb6
PEaN+9KIlRw4MIdrel5f7tYWVhy4H6AXVx9eardZN0ecbT6gZgYbzHqUk1oTO7gG
DJPKYlOQusqUTPKi25Vo91FhWCRE0YbxaEinR67PaOpytmEXfmtWPfI01xQo2E0G
gy8O2gEvENPDjpOl0eyqUhnd8PHDCUkQjRSUNrXJ8QKBgQDCtWXSirctH3vi3ivg
Rc5MR/lO6PvSxvCe18isUPubGun5h/n7qPtuX+pDdn+6XtzCpCCR+QtdY48HyAzE
ftOTmdvsP/0zKzSLaoBoOohdIEkTv9wQF9Cqr+hfgNGvPhrGhMsj3iWKWGeW0bNa
CVegr6HWr895ldRyzpbDG+rNWQKBgQC/gPC9OVqveikq6HGZGxAdzYtvoxtY89g5
5QcftN/B/w1CCnxRsg19HNXHCdeUNWnCCJq/TAFjyFV+HDaOyuyEz0NAdGTcXU2N
91zsqT1VI2+KqUbPLdPFGGP8uaxymsP3CZipEpi+QLbDBPGxKyTa9OHpwwa/cRfH
Qo0WCNwkHQKBgQCoTXZTVHZbubAzfUm91XkqNLiKfhdWrYHGO82JLYMfIleGywPJ
hdq4II51fBOSPHdkg8xngTdSpUE4P7LRkrM+Daus/e7WcQ09SXTvI1FF9idUu+3z
tzI2qFEbZFVbvjoUySpyuY4HlL0N//ug4xxsmAQzd8rGVT3Lc0mcIyCGGQKBgDc/
YLSGhmYXjSbm1lcAWr7uXKrBWJNqDdht/YclLGSQS2fhFIqRHpkYp4f7i+kjG7ax
usszhzcdRaTTSN4bJu8NyG4g5jQ46rXpRjK0hJA6X+SV/2qn4u96oOX5Pwn1IlHz
v8oPJmfEzbUniP6+3qwYd9Bzxk+WtfBzf7Z6qd/1AoGAOCNWyZ61lOAgpovxU7SW
dDqIf7ND6ZeXReTCUVVPasd6VVDuDuFLspev70PxYCftkfuYjPfxbHTojaEZMZIx
qbU8Xw/2quNUOooU+6wFOX+vc29S8KTQDjPQ7jnoY2hrR0PvWs5NWZAn5bzpw7QW
DhkqJrH2HZT2k8sdqSNTCUI=
-----END PRIVATE KEY-----`,
  spreadsheetId: '1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40'
};

try {
  // Crear contenido del archivo .env.local
  const envContent = `# Google Sheets Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=${googleSheetsConfig.serviceAccountEmail}
GOOGLE_PRIVATE_KEY="${googleSheetsConfig.privateKey.replace(/\n/g, '\\n')}"
GOOGLE_SHEETS_SPREADSHEET_ID=${googleSheetsConfig.spreadsheetId}

# Configuración adicional (opcional)
# NODE_ENV=development
`;

  // Escribir archivo .env.local
  fs.writeFileSync('.env.local', envContent);
  
  console.log('✅ Archivo .env.local creado exitosamente');
  console.log('📊 Configuración de Google Sheets:');
  console.log(`   📧 Email: ${googleSheetsConfig.serviceAccountEmail}`);
  console.log(`   📋 Spreadsheet ID: ${googleSheetsConfig.spreadsheetId}`);
  console.log('   🔑 Clave privada: ✓ Configurada');
  
  console.log('\n🔗 Para verificar la conexión:');
  console.log('1. Reinicia el servidor: npm run dev');
  console.log('2. Ve a: http://localhost:3000/configuracion');
  console.log('3. Verifica el estado de Google Sheets');
  
  console.log('\n⚠️  Asegúrate de que:');
  console.log(`   ✓ Compartiste la hoja con: ${googleSheetsConfig.serviceAccountEmail}`);
  console.log('   ✓ Le diste permisos de "Editor"');
  console.log('   ✓ Habilitaste Google Sheets API en Google Cloud');

} catch (error) {
  console.error('❌ Error creando .env.local:', error.message);
  console.log('\n📝 Crea manualmente el archivo .env.local con:');
  console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL=registro-eventos-service@registro-cobre.iam.gserviceaccount.com');
  console.log('GOOGLE_PRIVATE_KEY="[clave privada completa]"');
  console.log('GOOGLE_SHEETS_SPREADSHEET_ID=1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40');
} 