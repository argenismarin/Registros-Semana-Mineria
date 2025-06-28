# Sistema de Registro de Eventos - Semana de la Minería

Sistema completo de registro de asistentes para eventos, con generación de códigos QR, impresión de escarapelas y sincronización en tiempo real con Google Sheets.

## 🚀 Funcionalidades Principales

### ✅ Gestión de Asistentes
- Registro de asistentes con información completa
- Importación masiva desde archivos CSV/Excel
- Edición y actualización de datos
- Marcado de asistencia mediante QR

### 📱 Códigos QR
- Generación automática de códigos QR únicos
- Escaner QR integrado para marcar asistencia
- Generación masiva de códigos QR
- Sistema de validación en tiempo real

### 🎫 Escarapelas
- Diseño personalizado de escarapelas (98mm × 128mm)
- Generación de PDF optimizado para impresión
- Formato específico: solo nombre y cargo
- Posicionamiento preciso del texto

### 📊 Sincronización y Reportes
- Integración completa con Google Sheets
- Sincronización automática en tiempo real
- Reportes en PDF
- Diagnósticos del sistema

### ⚡ Tiempo Real
- Actualizaciones instantáneas con Socket.io
- Estado de asistencia en vivo
- Notificaciones automáticas

## 🛠 Tecnologías Utilizadas

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: API Routes de Next.js
- **Base de Datos**: Sistema en memoria con sincronización
- **PDF**: jsPDF para generación de documentos
- **QR**: qrcode para generación, jsQR para escáner
- **Tiempo Real**: Socket.io
- **Integración**: Google Sheets API

## 📦 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/argenismarin/Registros-Semana-Mineria.git
   cd Registros-Semana-Mineria
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.vercel.example .env.local
   ```
   
   Configurar las variables necesarias:
   - `GOOGLE_SHEETS_PRIVATE_KEY`
   - `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_SPREADSHEET_ID`

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

## 🔧 Configuración de Google Sheets

1. Crear un proyecto en Google Cloud Console
2. Habilitar Google Sheets API
3. Crear credenciales de cuenta de servicio
4. Compartir la hoja de cálculo con el email de la cuenta de servicio
5. Configurar las variables de entorno

Ver `GOOGLE_SHEETS_SETUP.md` para instrucciones detalladas.

## 📝 Estructura del Proyecto

```
src/
├── app/
│   ├── api/           # API Routes
│   ├── components/    # Componentes React
│   └── pages/         # Páginas de la aplicación
├── lib/
│   ├── database.ts    # Gestión de datos
│   └── googleSheets.ts # Integración Google Sheets
└── types/             # Tipos TypeScript
```

## 🎯 Páginas Principales

- `/` - Dashboard principal
- `/importar` - Importación de asistentes
- `/escarapelas` - Generación de escarapelas
- `/qr-masivo` - Generación masiva de QR
- `/test-qr-scanner` - Escáner de códigos QR
- `/reportes` - Reportes y estadísticas
- `/configuracion` - Configuración del sistema

## 📄 Funcionalidades Especiales

### Escarapelas Personalizadas
- Formato: 98mm × 128mm
- Posición del texto: x=26mm, y=53mm
- Fuentes: Nombre 20pt, Cargo 15pt
- Una escarapela por página para impresión directa

### Sistema QR
- Códigos únicos por asistente
- Validación en tiempo real
- Prevención de marcados duplicados
- Historial de asistencia

## 🚀 Despliegue

El proyecto está configurado para despliegue en:
- **Vercel** (recomendado)
- **Hostinger** con PM2
- **Servidor propio** con Nginx

Ver archivos de configuración:
- `vercel.json`
- `ecosystem.config.js`
- `nginx.conf.example`

## 📋 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Construcción para producción
npm run start        # Servidor de producción
npm run test         # Ejecutar pruebas
```

## 🔒 Seguridad

- Variables de entorno para datos sensibles
- Validación de datos en servidor
- Sanitización de entradas
- Manejo seguro de archivos

## 📞 Soporte

Para problemas o consultas sobre el sistema, revisar:
- `STATUS.md` - Estado actual del proyecto
- `FUNCIONALIDADES.md` - Documentación detallada
- Issues del repositorio

---

**Desarrollado para la Semana de la Minería**  
Sistema completo de gestión de eventos con tecnología moderna. 