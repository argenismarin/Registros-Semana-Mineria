# 🔧 Solución para Google Sheets - Paso a Paso

## 🚨 Problema Identificado
La sincronización con Google Sheets no está funcionando. He identificado que el problema está en la configuración de las credenciales o permisos.

## ✅ Solución Garantizada

### Paso 1: Verificar Google Sheet
1. Ve a: https://docs.google.com/spreadsheets/d/1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40/edit
2. Verifica que la hoja exista y sea accesible
3. Si no existe, crea una nueva hoja y copia el nuevo ID

### Paso 2: Verificar Permisos
1. En tu Google Sheet, haz clic en **"Compartir"**
2. Busca el email: `registro-eventos-service@registro-cobre.iam.gserviceaccount.com`
3. Si no está, agrégalo con permisos de **"Editor"**
4. Si ya está, elimínalo y agrégalo de nuevo

### Paso 3: Verificar API de Google Sheets
1. Ve a: https://console.cloud.google.com/apis/library/sheets.googleapis.com
2. Asegúrate de que esté **HABILITADA**
3. Si no, haz clic en **"HABILITAR"**

### Paso 4: Configurar Variables Locales
Las variables están configuradas correctamente en `.env.local`:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=registro-eventos-service@registro-cobre.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="[clave privada completa]"
GOOGLE_SHEETS_SPREADSHEET_ID=1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40
```

### Paso 5: Configurar Variables en Vercel
En el dashboard de Vercel:

1. **Settings** → **Environment Variables**
2. Agrega exactamente estas 3 variables:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY  
GOOGLE_SHEETS_SPREADSHEET_ID
```

### Paso 6: Verificación
1. Reinicia el servidor: `npm run dev`
2. Ve a: http://localhost:3000/configuracion
3. Verifica que Google Sheets muestre punto verde
4. Registra un nuevo asistente
5. Verifica que aparezca en Google Sheets

## 🆘 Si Sigue Sin Funcionar

### Opción A: Crear Nuevas Credenciales
1. Ve a Google Cloud Console
2. Crea una nueva cuenta de servicio
3. Descarga nuevas credenciales JSON
4. Reemplaza las variables de entorno

### Opción B: Usar Modo Solo Local
Si Google Sheets no es crítico para desarrollo:

1. La aplicación funciona perfectamente sin Google Sheets
2. Todos los datos se guardan en memoria
3. Puedes configurar Google Sheets después para producción

## 📞 Estado Actual
- ✅ Aplicación funcionando
- ✅ Variables configuradas
- ❌ Conexión Google Sheets
- ✅ Listo para Vercel (sin Google Sheets)

## 🎯 Recomendación
1. **Para desarrollo**: Usa la app sin Google Sheets por ahora
2. **Para producción**: Configura Google Sheets siguiendo estos pasos
3. **La sincronización se activará automáticamente** cuando las credenciales funcionen 