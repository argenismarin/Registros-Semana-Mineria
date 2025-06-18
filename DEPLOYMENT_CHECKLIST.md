# 📋 CHECKLIST DE DEPLOYMENT

## Antes del Deployment
- [ ] Verificar que `npm run build` funciona localmente
- [ ] Configurar variables de entorno en .env.local
- [ ] Obtener credenciales de Google Sheets
- [ ] Configurar dominio para apuntar al VPS
- [ ] Tener acceso SSH al servidor

## En el Servidor (VPS)
- [ ] Node.js 18+ instalado
- [ ] PM2 instalado globalmente (`npm install -g pm2`)
- [ ] Nginx instalado
- [ ] Archivos del proyecto subidos
- [ ] Variables de entorno configuradas

## Deployment
- [ ] `npm ci --production`
- [ ] `npm run build`
- [ ] `pm2 start ecosystem.config.js`
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
```bash
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
```
