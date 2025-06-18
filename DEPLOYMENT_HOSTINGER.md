# 🚀 Guía de Deployment en Hostinger

## 📋 Tipos de Hosting Hostinger y Compatibilidad

### 🔴 **Hosting Compartido** (Business, Premium)
- ❌ **NO compatible** con aplicaciones Node.js
- ❌ **NO soporta** Socket.io
- ❌ **NO permite** servidores personalizados
- ✅ **Solo** sitios web estáticos (HTML, CSS, JS, PHP)

### 🟡 **Cloud Hosting**
- ✅ **Compatible** con Node.js
- ⚠️ **Limitado** en recursos y configuración
- ❌ **Problemas** con Socket.io en tiempo real
- ✅ **Mejor opción** para aplicaciones simples

### 🟢 **VPS (Recomendado)**
- ✅ **Totalmente compatible** con Next.js
- ✅ **Soporte completo** para Socket.io
- ✅ **Control total** del servidor
- ✅ **Mejor rendimiento** y flexibilidad

## 🎯 Recomendación por Tipo de Hosting

### Si tienes **Hosting Compartido**:
**Opción 1: Upgrader a VPS** (Recomendado)
**Opción 2: Usar Vercel/Netlify** para el frontend + API externa
**Opción 3: Simplificar** removiendo Socket.io y usando solo PHP/MySQL

### Si tienes **Cloud Hosting**:
**Opción 1: Deployment básico** sin tiempo real
**Opción 2: Upgrade a VPS** para funcionalidad completa

### Si tienes **VPS**:
**✅ Deployment completo** con todas las funcionalidades

---

## 🛠️ DEPLOYMENT EN VPS HOSTINGER

### **Paso 1: Preparar el Proyecto**

1. **Crear archivo de configuración de producción**
```bash
# En tu proyecto local
npm run build
```

2. **Configurar variables de entorno para producción**
```bash
# Crear .env.production
NODE_ENV=production
PORT=3000
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SERVICE_EMAIL=tu-service@proyecto.iam.gserviceaccount.com
GOOGLE_SPREADSHEET_ID=tu_spreadsheet_id
NEXT_PUBLIC_SOCKET_URL=https://tu-dominio.com
```

### **Paso 2: Conectar al VPS**

1. **Acceder al panel de Hostinger**
   - Ve a hPanel → VPS → Gestión
   - Accede via SSH o Web Terminal

2. **Conectar por SSH** (Método recomendado)
```bash
ssh root@tu-ip-vps
# O usar el usuario que te proporcione Hostinger
```

### **Paso 3: Instalar Node.js en el VPS**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js y npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar PM2 para gestión de procesos
sudo npm install -g pm2
```

### **Paso 4: Subir el Proyecto**

**Método 1: Git (Recomendado)**
```bash
# En el VPS
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo

# O si no usas Git, sube los archivos via FTP/SFTP
```

**Método 2: Comprimir y subir**
```bash
# En tu PC: comprimir proyecto (sin node_modules)
zip -r proyecto.zip . -x node_modules/\*

# Subir via File Manager de Hostinger
# Extraer en /public_html/ o directorio deseado
```

### **Paso 5: Configurar el Proyecto en el VPS**

```bash
# Navegar al directorio del proyecto
cd /path/to/tu-proyecto

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
nano .env.local

# Pegar tu configuración:
NODE_ENV=production
PORT=3000
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[Tu clave privada completa aquí]
-----END PRIVATE KEY-----"
GOOGLE_SERVICE_EMAIL=registro-eventos-service@registro-cobre.iam.gserviceaccount.com
GOOGLE_SPREADSHEET_ID=1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40

# Construir el proyecto
npm run build

# Probar que funciona
npm start
```

### **Paso 6: Configurar PM2 (Gestión de Procesos)**

```bash
# Crear archivo de configuración PM2
nano ecosystem.config.js
```

Contenido del archivo:
```javascript
module.exports = {
  apps: [{
    name: 'registro-eventos',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/tu-proyecto',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

```bash
# Crear directorio de logs
mkdir logs

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js

# Configurar PM2 para auto-iniciar
pm2 startup
pm2 save

# Verificar estado
pm2 status
pm2 logs registro-eventos
```

### **Paso 7: Configurar Nginx (Servidor Web)**

```bash
# Instalar Nginx si no está instalado
sudo apt install nginx -y

# Crear configuración del sitio
sudo nano /etc/nginx/sites-available/tu-dominio.com
```

Configuración de Nginx:
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Para Socket.io
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Archivos estáticos
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

```bash
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/tu-dominio.com /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### **Paso 8: Configurar SSL con Certbot**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL gratuito
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Verificar auto-renovación
sudo certbot renew --dry-run
```

### **Paso 9: Configurar Firewall**

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

---

## 🔄 DEPLOYMENT EN CLOUD HOSTING

### **Limitaciones:**
- Socket.io puede no funcionar correctamente
- Recursos limitados
- Menos control de configuración

### **Proceso Simplificado:**
1. **Activar Node.js** en el panel de Hostinger
2. **Subir archivos** via File Manager
3. **Configurar variables** de entorno
4. **Instalar dependencias** via terminal web
5. **Iniciar aplicación**

---

## 🔧 CONFIGURACIONES ESPECÍFICAS

### **Base de Datos Persistente**

Actualmente usas memoria, para producción necesitas:

**Opción 1: MySQL (Incluido en Hostinger)**
```javascript
// lib/database.js
import mysql from 'mysql2/promise'

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'tu_usuario_db',
  password: 'tu_password_db',
  database: 'tu_base_datos'
})
```

**Opción 2: PostgreSQL**
**Opción 3: MongoDB Atlas** (Externo, gratis)

### **Google Sheets en Producción**

```bash
# Variables de entorno seguras
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SERVICE_EMAIL=tu-service@proyecto.iam.gserviceaccount.com
GOOGLE_SPREADSHEET_ID=tu_spreadsheet_id
```

### **Socket.io en Producción**

```javascript
// Configuración para producción
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["https://tu-dominio.com", "https://www.tu-dominio.com"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
})
```

---

## 📝 CHECKLIST DE DEPLOYMENT

### **Antes del Deployment:**
- [ ] Proyecto buildea sin errores localmente
- [ ] Variables de entorno configuradas
- [ ] Google Sheets funcionando
- [ ] Credenciales de producción listas
- [ ] Dominio apuntando al VPS

### **Durante el Deployment:**
- [ ] Node.js instalado en VPS
- [ ] Proyecto subido y dependencias instaladas
- [ ] PM2 configurado y funcionando
- [ ] Nginx configurado como proxy
- [ ] SSL configurado con Certbot
- [ ] Firewall configurado

### **Después del Deployment:**
- [ ] Aplicación accesible desde el dominio
- [ ] Socket.io funcionando (tiempo real)
- [ ] Google Sheets sincronizando
- [ ] QR codes generándose correctamente
- [ ] Reportes funcionando
- [ ] Backup automatizado configurado

---

## 🚨 ALTERNATIVAS SI TIENES HOSTING COMPARTIDO

### **Opción 1: Vercel + Base de Datos Externa**
```bash
# Deployment automático en Vercel
npm install -g vercel
vercel --prod
```

### **Opción 2: Netlify + Serverless Functions**
### **Opción 3: Simplificar a PHP + MySQL**
### **Opción 4: Upgrade a VPS Hostinger**

---

## 💡 RECOMENDACIONES FINALES

### **Para Mejor Rendimiento:**
1. **VPS con al menos 2GB RAM**
2. **SSD Storage**
3. **CDN para archivos estáticos**
4. **Backup automatizado**
5. **Monitoreo con PM2**

### **Para Ahorro de Costos:**
1. **Empezar con Cloud Hosting**
2. **Evaluar uso real**
3. **Migrar a VPS si es necesario**

---

**¿Qué tipo de hosting tienes actualmente en Hostinger?** 
Esto determinará la estrategia exacta a seguir. 