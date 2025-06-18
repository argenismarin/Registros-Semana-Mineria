# 🎯 Sistema de Registro de Eventos

Sistema completo para gestión de eventos con registro de asistentes, generación de QR codes, y sincronización con Google Sheets en tiempo real.

## 🚀 Deployment en Vercel (CONFIGURADO ✅)

### **¡Todo está listo para Vercel!** Solo sigue estos pasos:

### **1. Subir a GitHub**
```bash
# Inicializar repositorio (si no lo has hecho)
git init
git add .
git commit -m "Sistema de registro de eventos listo para Vercel"

# Conectar a GitHub
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### **2. Conectar con Vercel**
1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu cuenta de GitHub
3. Selecciona tu repositorio
4. Vercel detectará automáticamente que es un proyecto Next.js
5. Haz clic en **"Deploy"**

### **3. Configurar Variables de Entorno en Vercel**
En el dashboard de Vercel:
1. Ve a **Settings → Environment Variables**
2. Agrega estas variables (copia desde `env.vercel.example`):

```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[TU_CLAVE_PRIVADA_COMPLETA]
-----END PRIVATE KEY-----"

GOOGLE_SERVICE_EMAIL=registro-eventos-service@registro-cobre.iam.gserviceaccount.com

GOOGLE_SPREADSHEET_ID=1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40
```

### **4. ¡Listo! 🎉**
- Tu sitio estará disponible en: `https://tu-proyecto.vercel.app`
- Cada push a `main` actualiza automáticamente
- SSL incluido gratis
- CDN global automático

---

## ✨ Características

- ✅ **Registro de asistentes** con formulario completo
- ✅ **Generación de QR codes** individuales y masivos
- ✅ **Escaner QR** para marcar asistencia
- ✅ **Sincronización con Google Sheets** en tiempo real
- ✅ **Reportes y estadísticas** en tiempo real
- ✅ **Interfaz responsive** y moderna
- ✅ **Optimizado para Vercel** (deployment automático)

## 🛠️ Tecnologías

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Socket.io** - Comunicación en tiempo real
- **Google Sheets API** - Persistencia de datos
- **QR Code Generator** - Generación de códigos QR
- **jsQR** - Scanner de códigos QR

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   │   ├── asistentes/    # CRUD asistentes
│   │   ├── qr/           # Generación/scan QR
│   │   ├── socket.io/    # WebSocket server
│   │   └── ...
│   ├── configuracion/     # Configuración del evento
│   ├── importar/         # Importar desde Google Sheets
│   ├── qr-masivo/        # Generación masiva de QR
│   ├── reportes/         # Reportes y estadísticas
│   └── page.tsx          # Página principal
├── components/            # Componentes reutilizables
├── lib/                  # Utilidades y configuración
└── types/                # Definiciones de tipos
```

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.vercel.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

## 📊 Google Sheets Setup

1. **Crear Service Account** en Google Cloud Console
2. **Generar credenciales JSON**
3. **Compartir hoja de cálculo** con el email del service account
4. **Configurar variables** en Vercel

Ver `GOOGLE_SHEETS_SETUP.md` para instrucciones detalladas.

## 🔄 Funcionalidades en Tiempo Real

- **Socket.io** integrado con Vercel
- **Actualizaciones automáticas** cuando se marca asistencia
- **Sincronización** con Google Sheets
- **Estadísticas en vivo**

## 📱 Características Móviles

- **Scanner QR nativo** en dispositivos móviles
- **Interfaz responsive** para tablets y smartphones
- **PWA ready** para instalación como app

## 🚀 Ventajas de Vercel

- ✅ **Deployment automático** con cada push
- ✅ **SSL gratis** y automático
- ✅ **CDN global** para máximo rendimiento
- ✅ **Scaling automático** según demanda
- ✅ **Zero config** - funciona sin configuración adicional
- ✅ **Preview deployments** para cada PR

## 📋 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linting del código

# Deployment
git push origin main # Auto-deploy en Vercel
```

## 🔐 Seguridad

- Variables de entorno protegidas en Vercel
- Validación de datos en servidor
- CORS configurado para Socket.io
- Rate limiting automático

## 🐛 Troubleshooting

### **Error de Google Sheets**
- Verificar que las credenciales estén correctas
- Confirmar que la hoja esté compartida con el service account

### **Socket.io no funciona**
- Vercel maneja WebSockets automáticamente
- Las configuraciones están pre-hechas

### **Build errors**
- Verificar que todas las dependencias estén instaladas
- Revisar errores de TypeScript

## 📞 Soporte

Si encuentras problemas:
1. Revisar los logs en Vercel Dashboard
2. Verificar variables de entorno
3. Comprobar configuración de Google Sheets

---

**🎉 ¡Tu sistema está listo para producción en Vercel!**

Solo necesitas:
1. Subir a GitHub
2. Conectar con Vercel
3. Configurar variables de entorno
4. ¡Disfrutar tu aplicación en línea! 