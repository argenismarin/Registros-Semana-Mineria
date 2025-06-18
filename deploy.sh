#!/bin/bash
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
