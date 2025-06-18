#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

console.log('🚀 Preparando proyecto para producción...\n')

async function prepareProduction() {
  try {
    // 1. Verificar que estamos en el directorio correcto
    if (!fs.existsSync('package.json')) {
      console.error('❌ Error: Ejecuta este script desde el directorio raíz del proyecto')
      process.exit(1)
    }

    // 2. Crear archivo .env.production template
    console.log('📝 Creando template de variables de entorno...')
    const envProduction = `# Variables de Entorno para Producción
# Copia este archivo como .env.local en tu servidor

NODE_ENV=production
PORT=3000

# Google Sheets Configuration
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[PEGAR_TU_CLAVE_PRIVADA_COMPLETA_AQUÍ]
-----END PRIVATE KEY-----"
GOOGLE_SERVICE_EMAIL=registro-eventos-service@registro-cobre.iam.gserviceaccount.com
GOOGLE_SPREADSHEET_ID=1ua609LyVhuIX3vVfiNSYEg4-Wcwnvd1nkzGKZGTWx40

# URL para Socket.io (cambiar por tu dominio)
NEXT_PUBLIC_SOCKET_URL=https://tu-dominio.com

# Base de datos (opcional, actualmente usa memoria)
# DATABASE_URL=mysql://usuario:password@localhost:3306/nombre_base_datos
`

    fs.writeFileSync('.env.production.template', envProduction)
    console.log('✅ Template .env.production.template creado')

    // 3. Crear archivo PM2 ecosystem
    console.log('📝 Creando configuración PM2...')
    const ecosystem = `module.exports = {
  apps: [{
    name: 'registro-eventos',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 5000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
}
`

    fs.writeFileSync('ecosystem.config.js', ecosystem)
    console.log('✅ ecosystem.config.js creado')

    // 4. Crear script de deployment
    console.log('📝 Creando script de deployment...')
    const deployScript = `#!/bin/bash
# Script de deployment para servidor
set -e

echo "🚀 Iniciando deployment..."

# Crear directorio de logs si no existe
mkdir -p logs

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --production

# Construir proyecto
echo "🔨 Construyendo proyecto..."
npm run build

# Reiniciar aplicación con PM2
echo "🔄 Reiniciando aplicación..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# Verificar estado
echo "📊 Estado de la aplicación:"
pm2 status

echo "✅ Deployment completado!"
echo "🌐 La aplicación debería estar disponible en el puerto 3000"
`

    fs.writeFileSync('deploy.sh', deployScript)
    // Hacer el script ejecutable
    if (process.platform !== 'win32') {
      fs.chmodSync('deploy.sh', '755')
    }
    console.log('✅ deploy.sh creado')

    // 5. Crear archivo .gitignore específico para producción
    console.log('📝 Actualizando .gitignore...')
    const gitignoreAdditions = `
# Production specific
.env.production
.env.local
logs/
*.log
pm2.json

# Certificates (if any)
*.pem
*.key
certificates/

# Backup files
*.backup
*.bak
`

    if (fs.existsSync('.gitignore')) {
      const currentGitignore = fs.readFileSync('.gitignore', 'utf8')
      if (!currentGitignore.includes('# Production specific')) {
        fs.appendFileSync('.gitignore', gitignoreAdditions)
        console.log('✅ .gitignore actualizado')
      }
    } else {
      fs.writeFileSync('.gitignore', gitignoreAdditions)
      console.log('✅ .gitignore creado')
    }

    // 6. Verificar build local
    console.log('🔨 Verificando que el proyecto builde correctamente...')
    try {
      await execAsync('npm run build')
      console.log('✅ Build exitoso')
    } catch (error) {
      console.error('❌ Error en build:', error.message)
      console.log('⚠️  Revisa los errores antes de hacer deployment')
    }

    // 7. Crear archivo de configuración Nginx
    console.log('📝 Creando configuración Nginx...')
    const nginxConfig = `# Configuración Nginx para el proyecto
# Archivo: /etc/nginx/sites-available/tu-dominio.com

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir HTTP a HTTPS (después de configurar SSL)
    # return 301 https://$server_name$request_uri;

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
        proxy_buffering off;
        proxy_read_timeout 24h;
        proxy_send_timeout 24h;
    }

    # Archivos estáticos con cache
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Logs
    access_log /var/log/nginx/registro-eventos.access.log;
    error_log /var/log/nginx/registro-eventos.error.log;
}

# Configuración HTTPS (se agrega automáticamente con certbot)
# server {
#     listen 443 ssl http2;
#     server_name tu-dominio.com www.tu-dominio.com;
#     
#     ssl_certificate /path/to/certificate.crt;
#     ssl_certificate_key /path/to/private.key;
#     
#     # Resto de configuración igual que HTTP
# }
`

    fs.writeFileSync('nginx.conf.example', nginxConfig)
    console.log('✅ nginx.conf.example creado')

    // 8. Crear checklist de deployment
    console.log('📝 Creando checklist de deployment...')
    const checklist = `# 📋 CHECKLIST DE DEPLOYMENT

## Antes del Deployment
- [ ] Verificar que \`npm run build\` funciona localmente
- [ ] Configurar variables de entorno en .env.local
- [ ] Obtener credenciales de Google Sheets
- [ ] Configurar dominio para apuntar al VPS
- [ ] Tener acceso SSH al servidor

## En el Servidor (VPS)
- [ ] Node.js 18+ instalado
- [ ] PM2 instalado globalmente (\`npm install -g pm2\`)
- [ ] Nginx instalado
- [ ] Archivos del proyecto subidos
- [ ] Variables de entorno configuradas

## Deployment
- [ ] \`npm ci --production\`
- [ ] \`npm run build\`
- [ ] \`pm2 start ecosystem.config.js\`
- [ ] Configurar Nginx
- [ ] Configurar SSL con certbot
- [ ] Configurar firewall

## Verificación Post-Deployment
- [ ] Sitio accesible desde el dominio
- [ ] Socket.io funcionando (tiempo real)
- [ ] Google Sheets sincronizando
- [ ] QR codes generándose
- [ ] Reportes funcionando
- [ ] Formularios guardando datos

## Mantenimiento
- [ ] Configurar backup automático
- [ ] Monitoreo con PM2
- [ ] Logs funcionando correctamente
- [ ] Auto-renovación SSL configurada

## Comandos Útiles en Servidor
\`\`\`bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs registro-eventos

# Reiniciar aplicación
pm2 restart registro-eventos

# Ver logs de Nginx
sudo tail -f /var/log/nginx/registro-eventos.error.log

# Verificar SSL
sudo certbot certificates

# Verificar estado del firewall
sudo ufw status
\`\`\`
`

    fs.writeFileSync('DEPLOYMENT_CHECKLIST.md', checklist)
    console.log('✅ DEPLOYMENT_CHECKLIST.md creado')

    // 9. Crear directorio de logs
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs')
      fs.writeFileSync('logs/.gitkeep', '')
      console.log('✅ Directorio logs/ creado')
    }

    console.log('\n🎉 ¡Preparación para producción completada!')
    console.log('\n📁 Archivos creados:')
    console.log('   - .env.production.template')
    console.log('   - ecosystem.config.js')
    console.log('   - deploy.sh')
    console.log('   - nginx.conf.example')
    console.log('   - DEPLOYMENT_CHECKLIST.md')
    console.log('   - logs/ (directorio)')
    
    console.log('\n🚀 Próximos pasos:')
    console.log('1. Lee DEPLOYMENT_HOSTINGER.md para guía completa')
    console.log('2. Configura .env.local en tu servidor con tus credenciales')
    console.log('3. Sube el proyecto a tu VPS de Hostinger')
    console.log('4. Ejecuta ./deploy.sh en el servidor')
    console.log('5. Configura Nginx con nginx.conf.example')
    console.log('6. Configura SSL con certbot')

  } catch (error) {
    console.error('❌ Error preparando para producción:', error.message)
    process.exit(1)
  }
}

prepareProduction() 