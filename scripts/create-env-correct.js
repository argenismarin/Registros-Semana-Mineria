const fs = require('fs');

console.log('🔧 Creando .env.local con formato correcto para Next.js...\n');

// Clave privada en formato correcto (una sola línea con \n escapados)
const privateKey = `-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCRp2jE+cTxpcf6\\nugxjZE+OVj5LvFjtkyha+hYU9movw8Xw8fjEnH+5Q+ZpHGe3oc5D3od5+4wxHtOa\\nHEWOh6d1qypHzFxjwABS1JqXYTsul3whgyFcM284/AuqooMwWsOua8Vz6Zy7MPMa\\niikh6ItRaDxbwNMv3oDpNXHYD3cIVyufnBRM+WIKxhhcAi2Trsp2aWLUa0FJuMid\\n1pRpsgVrGK+IObGAEb3Tch36g2lbBM29ne331M6eXtd/TtcpLgjENArEe1f4NQup\\n1ZLbSTgTkNQ5pDKBgNX451+DQ2UhplNL0MZc/66jNkAoXO1rqzoOY6PZoe/WwpBf\\nguBu9ccVAgMBAAECggEABG6pOZ4PvnpY5XBshXvDqTITqQW9JdTQ3HZFKycieeI4\\n73xiVK1RSUesYJRDAOuiFYU7u/XWwTBODrlmHnbsHO1z/Ti8f2aUCL4I5ESXr4yT\\nJ1WDs6tD0UkBaK357jdDQoprn3uptgKNa0g7OMzVEuM1CJlYc9nCZ3y/KNMaDRb6\\nPEaN+9KIlRw4MIdrel5f7tYWVhy4H6AXVx9eardZN0ecbT6gZgYbzHqUk1oTO7gG\\nDJPKYlOQusqUTPKi25Vo91FhWCRE0YbxaEinR67PaOpytmEXfmtWPfI01xQo2E0G\\ngy8O2gEvENPDjpOl0eyqUhnd8PHDCUkQjRSUNrXJ8QKBgQDCtWXSirctH3vi3ivg\\nRc5MR/lO6PvSxvCe18isUPubGun5h/n7qPtuX+pDdn+6XtzCpCCR+QtdY48HyAzE\\nftOTmdvsP/0zKzSLaoBoOohdIEkTv9wQF9Cqr+hfgNGvPhrGhMsj3iWKWGeW0bNa\\nCVegr6HWr895ldRyzpbDG+rNWQKBgQC/gPC9OVqveikq6HGZGxAdzYtvoxtY89g5\\n5QcftN/B/w1CCnxRsg19HNXHCdeUNWnCCJq/TAFjyFV+HDaOyuyEz0NAdGTcXU2N\\n91zsqT1VI2+KqUbPLdPFGGP8uaxymsP3CZipEpi+QLbDBPGxKyTa9OHpwwa/cRfH\\nQo0WCNwkHQKBgQCoTXZTVHZbubAzfUm91XkqNLiKfhdWrYHGO82JLYMfIleGywPJ\\nhdq4II51fBOSPHdkg8xngTdSpUE4P7LRkrM+Daus/e7WcQ09SXTvI1FF9idUu+3z\\ntzI2qFEbZFVbvjoUySpyuY4HlL0N//ug4xxsmAQzd8rGVT3Lc0mcIyCGGQKBgDc/\\nYLSGhmYXjSbm1lcAWr7uXKrBWJNqDdht/YclLGSQS2fhFIqRHpkYp4f7i+kjG7ax\\nusszhzcdRaTTSN4bJu8NyG4g5jQ46rXpRjK0hJA6X+SV/2qn4u96oOX5Pwn1IlHz\\nv8oPJmfEzbUniP6+3qwYd9Bzxk+WtfBzf7Z6qd/1AoGAOCNWyZ61lOAgpovxU7SW\\ndDqIf7ND6ZeXReTCUVVPasd6VVDuDuFLspev70PxYCftkfuYjPfxbHTojaEZMZIx\\nqbU8Xw/2quNUOooU+6wFOX+vc29S8KTQDjPQ7jnoY2hrR0PvWs5NWZAn5bzpw7QW\\nDhkqJrH2HZT2k8sdqSNTCUI=\\n-----END PRIVATE KEY-----`;

// Contenido del archivo .env.local en formato correcto
const envContent = `# Google Sheets Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=registro-eventos-service@registro-cobre.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="${privateKey}"
GOOGLE_SHEETS_SPREADSHEET_ID=1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40
`;

try {
  // Escribir archivo .env.local
  fs.writeFileSync('.env.local', envContent, 'utf8');
  
  console.log('✅ Archivo .env.local creado correctamente');
  console.log('📋 Variables configuradas:');
  console.log('  ✓ GOOGLE_SERVICE_ACCOUNT_EMAIL');
  console.log('  ✓ GOOGLE_PRIVATE_KEY (formato correcto para Next.js)');
  console.log('  ✓ GOOGLE_SHEETS_SPREADSHEET_ID');
  
  console.log('\n🚀 Ahora ejecuta:');
  console.log('  npm run dev');
  console.log('\n💡 Y verifica en /configuracion que aparezca el punto verde');

} catch (error) {
  console.error('❌ Error creando .env.local:', error.message);
} 