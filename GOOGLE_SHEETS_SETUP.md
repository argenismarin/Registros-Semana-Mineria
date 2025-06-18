# 📊 Configuración de Google Sheets - Paso a Paso

Esta guía te ayudará a configurar Google Sheets para sincronizar automáticamente los datos de tu aplicación de registro de eventos.

## 🚀 Paso 1: Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en **"Seleccionar proyecto"** → **"Proyecto nuevo"**
3. Ingresa el nombre: `Registro Eventos` (o el que prefieras)
4. Haz clic en **"Crear"**
5. Asegúrate de tener seleccionado tu nuevo proyecto

## 🔌 Paso 2: Habilitar Google Sheets API

1. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
2. Busca: `Google Sheets API`
3. Haz clic en **"Google Sheets API"**
4. Presiona **"Habilitar"**

## 🔑 Paso 3: Crear Cuenta de Servicio

1. Ve a **"APIs y servicios"** → **"Credenciales"**
2. Haz clic en **"+ CREAR CREDENCIALES"** → **"Cuenta de servicio"**
3. Llena los datos:
   - **Nombre:** `registro-eventos-service`
   - **ID:** `registro-eventos-service` (se genera automáticamente)
   - **Descripción:** `Cuenta para acceder a Google Sheets desde la app`
4. Haz clic en **"Crear y continuar"**
5. En **"Función"**, selecciona **"Editor"** (o puedes omitir este paso)
6. Haz clic en **"Continuar"** → **"Listo"**

## 📄 Paso 4: Descargar Credenciales JSON

1. En la página de **"Credenciales"**, busca tu cuenta de servicio
2. Haz clic en el **email de la cuenta de servicio**
3. Ve a la pestaña **"Claves"**
4. Haz clic en **"Agregar clave"** → **"Crear clave nueva"**
5. Selecciona **"JSON"** → **"Crear"**
6. Se descargará un archivo JSON - **¡GUÁRDALO EN UN LUGAR SEGURO!**

## 📋 Paso 5: Crear Google Sheet

1. Ve a [Google Sheets](https://docs.google.com/spreadsheets/)
2. Haz clic en **"+ Nuevo"** para crear una hoja nueva
3. Ponle un nombre: `Registro de Eventos - [Nombre de tu evento]`
4. **¡IMPORTANTE!** Copia el ID de la hoja:
   - La URL será algo como: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
   - Copia la parte que dice `ESTE_ES_EL_ID`

## 🤝 Paso 6: Compartir la Hoja con la Cuenta de Servicio

1. En tu Google Sheet, haz clic en **"Compartir"** (botón azul arriba a la derecha)
2. En **"Agregar personas y grupos"**, pega el **email de la cuenta de servicio**
   - Lo encuentras en el archivo JSON descargado, campo `client_email`
   - Será algo como: `registro-eventos-service@tu-proyecto.iam.gserviceaccount.com`
3. Asegúrate de que tenga permisos de **"Editor"**
4. **DESACTIVA** la opción **"Notificar a las personas"**
5. Haz clic en **"Compartir"**

## ⚙️ Paso 7: Configurar Variables de Entorno

1. En tu proyecto, crea un archivo llamado `.env.local` (si no existe)
2. Abre el archivo JSON descargado en el Paso 4
3. Copia los valores y agrégalos al `.env.local`:

```bash
# ID de tu Google Sheet (del Paso 5)
GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# Email de la cuenta de servicio (del JSON: "client_email")
GOOGLE_SERVICE_ACCOUNT_EMAIL=registro-eventos-service@tu-proyecto.iam.gserviceaccount.com

# Clave privada (del JSON: "private_key") - MANTÉN LAS COMILLAS Y \n
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## ✅ Paso 8: Verificar Configuración

1. Reinicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a `/configuracion` en tu aplicación

3. Deberías ver un **punto verde** junto a "Google Sheets"

4. Haz clic en **"🔗 Probar conexión"** para verificar que todo funciona

## 📱 Información que Necesito

Para configurar Google Sheets correctamente, necesito que me proporciones:

### ✅ Del archivo JSON descargado:
- [ ] **client_email** (email de la cuenta de servicio)
- [ ] **private_key** (clave privada completa, incluyendo `-----BEGIN` y `-----END`)

### ✅ De tu Google Sheet:
- [ ] **Spreadsheet ID** (el ID de la URL de tu hoja)

### ✅ Confirmación:
- [ ] ¿Compartiste la hoja con el email de la cuenta de servicio?
- [ ] ¿Le diste permisos de "Editor"?

## 🔒 Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** compartas el archivo JSON o las credenciales
- El archivo `.env.local` está en `.gitignore` - no se subirá a Git
- Guarda una copia de respaldo del archivo JSON en un lugar seguro

## 🆘 Solución de Problemas

### Error: "Permission denied"
- Verifica que compartiste la hoja con el email correcto
- Asegúrate de dar permisos de "Editor"

### Error: "Spreadsheet not found"
- Verifica que el `GOOGLE_SHEETS_SPREADSHEET_ID` sea correcto
- Debe ser solo el ID, no la URL completa

### Error: "Invalid credentials"
- Verifica que el `GOOGLE_PRIVATE_KEY` esté completo
- Debe incluir `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Mantén las comillas dobles y los `\n`

## 📞 ¿Necesitas Ayuda?

Si tienes problemas, dime:
1. ¿En qué paso te atascaste?
2. ¿Qué mensaje de error aparece?
3. ¿Aparece el punto verde en `/configuracion`? 