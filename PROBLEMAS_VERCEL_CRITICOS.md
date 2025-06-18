# 🚨 PROBLEMAS CRÍTICOS QUE AFECTAN VERCEL

## 1. 🔴 FORMATO DE CLAVE PRIVADA (BLOQUEANTE)

### Problema:
```
Error: error:1E08010C:DECODER routines::unsupported
```

### Causa:
- Clave en formato PKCS#8 incompatible con OpenSSL de Vercel

### Solución:
- Regenerar clave de Google Cloud (formato automáticamente compatible)
- Verificar que empiece con `-----BEGIN PRIVATE KEY-----`

## 2. 🔴 VARIABLES DE ENTORNO MAL CONFIGURADAS

### Problemas detectados:

#### A. Comillas en la clave privada:
```bash
# ❌ INCORRECTO en Vercel:
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# ✅ CORRECTO en Vercel:
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

#### B. Saltos de línea mal escapados:
```bash
# ❌ Puede fallar:
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIB...

# ✅ Debe ser:
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

### Solución en Vercel Dashboard:
1. **Environment Variables → GOOGLE_PRIVATE_KEY**
2. **NO usar comillas**
3. **Pegar clave completa con saltos de línea reales**

## 3. 🔴 TIMEOUT EN FUNCIONES SERVERLESS

### Problema:
```json
"maxDuration": 30  // Puede ser insuficiente
```

### Riesgos:
- Google Sheets API lenta
- Operaciones con muchos registros
- Inicialización de auth lenta

### Solución:
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

## 4. 🔴 APIS DE GOOGLE CLOUD NO HABILITADAS

### APIs Requeridas:
- ✅ **Google Sheets API**
- ✅ **Google Drive API** (para crear hojas)
- ✅ **IAM Service Account Credentials API**

### Verificar en:
```
https://console.cloud.google.com/apis/library
Proyecto: registro-cobre
```

### Habilitar:
1. Google Sheets API
2. Google Drive API
3. IAM Service Account Credentials API

## 5. 🔴 PROBLEMA DE SINGLETON EN SERVERLESS

### Problema:
```typescript
// Este patrón no funciona en Vercel:
const googleSheetsService = new GoogleSheetsService()
export default googleSheetsService
```

### Causa:
- Cada función serverless es independiente
- No hay memoria compartida entre requests

### Solución:
```typescript
// Lazy initialization por request
export function getGoogleSheetsService() {
  return new GoogleSheetsService()
}
```

## 6. 🔴 PERMISOS INSUFICIENTES EN GOOGLE SHEET

### Problema:
```
Error: The caller does not have permission
```

### Verificar:
1. **Google Sheet compartido** con email de servicio
2. **Permisos: Editor** (no solo Viewer)
3. **Email exacto** de la cuenta de servicio

### Solución:
```
1. Ir a: https://docs.google.com/spreadsheets/d/1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40
2. Compartir → Agregar email de servicio
3. Permisos: Editor
4. Desactivar notificaciones
```

## 7. 🔴 MANEJO DE ERRORES DEFICIENTE

### Problema:
```typescript
catch (error) {
  console.error('Error:', error)
  return [] // Oculta el error real
}
```

### Solución:
```typescript
catch (error) {
  console.error('Error detallado:', error)
  throw new Error(`Google Sheets error: ${error.message}`)
}
```

## 8. 🔴 CONFIGURACIÓN DE NEXT.JS INCORRECTA

### Problema potencial:
```javascript
// next.config.js
env: {
  NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
}
```

### Riesgo:
- Variables públicas expuestas al cliente
- URLs incorrectas en producción

## 9. 🔴 DEPENDENCIAS INCOMPATIBLES

### Verificar versiones:
```json
"google-auth-library": "^9.4.0",  // ✅ Buena
"googleapis": "^128.0.0",         // ✅ Buena
"next": "^14.0.0"                 // ✅ Buena
```

### Posibles conflictos:
- Node.js version en Vercel vs local
- OpenSSL versions
- Module resolution

## 🎯 CHECKLIST COMPLETO PARA VERCEL

### Variables de Entorno:
- [ ] GOOGLE_SERVICE_ACCOUNT_EMAIL (sin comillas)
- [ ] GOOGLE_PRIVATE_KEY (sin comillas, con saltos reales)
- [ ] GOOGLE_SHEETS_SPREADSHEET_ID

### Google Cloud:
- [ ] Cuenta de servicio creada
- [ ] Clave descargada (formato JSON)
- [ ] APIs habilitadas (Sheets + Drive)
- [ ] Permisos asignados

### Google Sheet:
- [ ] Compartido con email de servicio
- [ ] Permisos: Editor
- [ ] Hoja "Asistentes" creada

### Vercel:
- [ ] Variables configuradas correctamente
- [ ] Deploy exitoso
- [ ] Logs sin errores
- [ ] Endpoint /api/diagnostico responde

### Verificación Final:
```bash
curl https://proyecto-registros.vercel.app/api/diagnostico
```

Debe retornar:
```json
{
  "status": "success",
  "mensaje": "Google Sheets configurado correctamente"
}
```

## 🚨 ERRORES COMUNES EN VERCEL

1. **Clave privada con formato incorrecto** → Regenerar
2. **Variables con comillas** → Remover comillas
3. **APIs no habilitadas** → Habilitar en Google Cloud
4. **Sheet no compartido** → Compartir con email de servicio
5. **Timeout por lentitud** → Aumentar maxDuration
6. **Permisos insuficientes** → Verificar roles IAM 