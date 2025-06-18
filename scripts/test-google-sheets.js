const { google } = require('googleapis');
const fs = require('fs');

console.log('🔍 Diagnóstico de Google Sheets...\n');

// Leer variables de entorno manualmente
let envVars = {};
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...value] = line.split('=');
      envVars[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

// Verificar variables de entorno
console.log('📋 Variables de entorno:');
console.log('  GOOGLE_SERVICE_ACCOUNT_EMAIL:', envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ Configurado' : '❌ NO configurado');
console.log('  GOOGLE_PRIVATE_KEY:', envVars.GOOGLE_PRIVATE_KEY ? '✅ Configurado' : '❌ NO configurado');
console.log('  GOOGLE_SHEETS_SPREADSHEET_ID:', envVars.GOOGLE_SHEETS_SPREADSHEET_ID ? '✅ Configurado' : '❌ NO configurado');
console.log();

if (!envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL || !envVars.GOOGLE_PRIVATE_KEY || !envVars.GOOGLE_SHEETS_SPREADSHEET_ID) {
  console.log('❌ Faltan variables de entorno');
  console.log('Contenido de .env.local:');
  console.log(Object.keys(envVars));
  process.exit(1);
}

async function testGoogleSheets() {
  try {
    console.log('🔐 Configurando autenticación...');
    
    // Configurar autenticación
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        private_key: envVars.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    console.log('✅ Autenticación configurada');

    // Crear cliente de Sheets
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Cliente de Google Sheets creado');

    // Obtener información del spreadsheet
    console.log('📊 Obteniendo información del spreadsheet...');
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId: envVars.GOOGLE_SHEETS_SPREADSHEET_ID,
    });

    console.log('✅ Spreadsheet encontrado:');
    console.log('  Título:', spreadsheetResponse.data.properties.title);
    console.log('  Hojas:', spreadsheetResponse.data.sheets.map(sheet => sheet.properties.title).join(', '));

    // Intentar leer datos
    console.log('\n📖 Intentando leer datos...');
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: envVars.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: 'A1:Z10',
    });

    console.log('✅ Lectura exitosa');
    console.log('  Filas encontradas:', readResponse.data.values ? readResponse.data.values.length : 0);

    // Intentar escribir datos de prueba
    console.log('\n✏️  Intentando escribir datos de prueba...');
    const timestamp = new Date().toISOString();
    
    const writeResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: envVars.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: 'A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Prueba de conexión', timestamp, 'Exitosa ✅']],
      },
    });

    console.log('✅ Escritura exitosa');
    console.log('  Filas actualizadas:', writeResponse.data.updates.updatedRows);

    console.log('\n🎉 ¡Google Sheets funciona perfectamente!');
    console.log('\n💡 Si no ves los datos en tu aplicación, verifica:');
    console.log('  1. Que el servidor esté reiniciado (npm run dev)');
    console.log('  2. Que no haya errores en la consola del navegador');
    console.log('  3. Que la página /configuracion muestre punto verde');

  } catch (error) {
    console.error('\n❌ Error conectando con Google Sheets:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensaje:', error.message);
    
    if (error.code) {
      console.error('Código:', error.code);
    }
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.error('\n🔧 Solución:');
      console.error('  1. Ve a tu Google Sheet:');
      console.error('     https://docs.google.com/spreadsheets/d/' + envVars.GOOGLE_SHEETS_SPREADSHEET_ID);
      console.error('  2. Haz clic en "Compartir"');
      console.error('  3. Agrega el email:', envVars.GOOGLE_SERVICE_ACCOUNT_EMAIL);
      console.error('  4. Dale permisos de "Editor"');
    }
    
    if (error.message.includes('UNAUTHENTICATED')) {
      console.error('\n🔧 Solución:');
      console.error('  1. Verifica que las credenciales sean correctas');
      console.error('  2. Asegúrate de que Google Sheets API esté habilitada');
    }
    
    if (error.message.includes('Spreadsheet') && error.message.includes('not found')) {
      console.error('\n🔧 Solución:');
      console.error('  1. Verifica que el Spreadsheet ID sea correcto');
      console.error('  2. Asegúrate de que la hoja exista y sea accesible');
    }
  }
}

testGoogleSheets(); 