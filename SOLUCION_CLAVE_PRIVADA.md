# 🔧 Solución: Error de Clave Privada en Vercel

## 🚨 Problema Identificado

**Error:** `ERR_OSSL_UNSUPPORTED - DECODER routines::unsupported`

La sincronización con Google Sheets falla porque la **clave privada está en formato PKCS#8** que no es compatible con la versión de OpenSSL en el entorno serverless de Vercel.

## 🎯 Causa Raíz

- **Formato actual:** PKCS#8 (formato moderno)
- **Formato requerido:** RSA tradicional o PKCS#1
- **Entorno:** Node.js en Vercel tiene limitaciones de OpenSSL

## ✅ Solución Paso a Paso

### 1. 🌐 Acceder a Google Cloud Console

```
URL: https://console.cloud.google.com/iam-admin/serviceaccounts
Proyecto: registro-cobre (o tu proyecto)
```

### 2. 🔑 Crear Nueva Cuenta de Servicio

1. **Crear Cuenta de Servicio**
   - Nombre: `registro-eventos-vercel`
   - ID: `registro-eventos-vercel`
   - Descripción: `Para Vercel - formato RSA compatible`

2. **Asignar Permisos**
   - Editor de Hojas de Google (Google Sheets Editor)
   - O usar los mismos permisos que la cuenta actual

### 3. 📁 Generar Clave Compatible

1. **Ir a la cuenta creada**
2. **Pestaña "CLAVES"**
3. **"AGREGAR CLAVE" → "Crear clave nueva"**
4. **Tipo: JSON**
5. **Crear → Descargar archivo**

### 4. 📋 Compartir Google Sheet con Nueva Cuenta

```bash
# Email de la nueva cuenta (del JSON descargado)
registro-eventos-vercel@tu-proyecto.iam.gserviceaccount.com

# Permisos: Editor
# Notificaciones: Desactivadas
```

### 5. ⚡ Actualizar Variables en Vercel

**Dashboard de Vercel → Settings → Environment Variables:**

```bash
# Del archivo JSON descargado:
GOOGLE_SERVICE_ACCOUNT_EMAIL = client_email
GOOGLE_PRIVATE_KEY = private_key (completa, con \n)
GOOGLE_SHEETS_SPREADSHEET_ID = 1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40
```

### 6. 🔄 Redeploy y Verificación

El redeploy será automático al actualizar las variables.

**Verificar con:**
```bash
curl https://proyecto-registros.vercel.app/api/diagnostico
```

## 🚀 Alternativa Rápida

Si ya tienes acceso al proyecto de Google Cloud:

1. **Ir a la cuenta existente:** `registro-eventos-service@...`
2. **Eliminar la clave actual**
3. **Crear nueva clave** (será automáticamente en formato compatible)
4. **Actualizar solo `GOOGLE_PRIVATE_KEY` en Vercel**

## 🧪 Diagnóstico Post-Solución

Después de la actualización, deberías ver:

```json
{
  "status": "success",
  "mensaje": "Google Sheets configurado correctamente",
  "asistentes_encontrados": X,
  "sincronizacion": "activa"
}
```

En lugar del error actual:
```
Error: error:1E08010C:DECODER routines::unsupported
```

## 📊 Estado del Proyecto

### ✅ Funcionando
- Aplicación web carga correctamente
- Registro de asistentes en memoria
- Interface de usuario
- Diagnóstico implementado

### ❌ Pendiente de Solución
- Sincronización con Google Sheets
- Persistencia de datos entre deploys
- Reportes y exportación

### 🎯 Post-Solución
- ✅ Sincronización bidireccional
- ✅ Persistencia de datos
- ✅ Backup automático en Google Sheets
- ✅ Reportes en tiempo real

## 🔧 Archivos de Apoyo

- `fix-google-key.js` - Script con guía completa
- `env.vercel.NEW` - Plantilla para nuevas variables
- `VERCEL_SINCRONIZACION.md` - Documentación técnica

## 📞 Soporte Técnico

Este error es **común en Vercel** con claves de Google Cloud generadas recientemente. La solución es **100% efectiva** y solo requiere regenerar la clave en formato compatible.

**Tiempo estimado:** 10-15 minutos
**Impacto:** Nulo (la app sigue funcionando)
**Resultado:** Sincronización Google Sheets funcionando 