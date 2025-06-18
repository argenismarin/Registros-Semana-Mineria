# 📱 Generación Masiva de Códigos QR

## Descripción
Sistema completo para generar códigos QR de forma masiva, optimizado para impresión en diferentes formatos y con capacidad de envío automático a impresoras.

## Características Principales

### 🔍 Filtros Avanzados
- **Todos los asistentes**: Incluye a todos los registrados
- **Solo no presentes**: Filtra únicamente asistentes que no han llegado al evento
- **Sin QR generado**: Muestra solo asistentes que no tienen códigos QR generados previamente
- **Filtro por empresa**: Permite seleccionar asistentes de empresas específicas

### 📐 Formatos de Impresión
1. **Stickers Circulares** (5cm x 5cm)
   - Ideales para adherir a gafetes
   - Formato compacto

2. **Tarjetas Rectangulares** (8.5cm x 5.5cm)
   - Formato tarjeta de visita
   - Información más detallada

3. **Badges Corporativos** (10cm x 7cm)
   - Con información completa del asistente
   - Formato profesional

4. **Personalizado** (Variable)
   - Configuración manual de dimensiones
   - Máxima flexibilidad

### ⚙️ Opciones de Configuración
- **Tamaño del QR**: Pequeño (2cm), Mediano (3cm), Grande (4cm)
- **Layout**: Configuración de columnas y filas por página
- **Información a incluir**: Nombre, empresa, cargo (seleccionables)
- **Copias por asistente**: 1-10 copias de cada código QR

### 🖨️ Sistema de Impresión
- **Detección automática** de impresoras del sistema
- **Envío directo** a impresora seleccionada
- **Fallback a descarga** si no hay impresoras disponibles
- **Soporte multiplataforma**: Windows, macOS, Linux

## Arquitectura Técnica

### APIs Implementadas

#### `/api/qr/masivo` (POST)
Genera PDF con múltiples códigos QR
- Recibe lista de asistentes y opciones
- Crea PDF optimizado para impresión
- Maneja diferentes formatos y tamaños

#### `/api/impresoras` (GET)
Detecta impresoras disponibles
- Ejecuta comandos específicos por SO
- Devuelve lista de impresoras detectadas
- Fallback a impresoras comunes

#### `/api/imprimir` (POST)
Envía PDF a impresora
- Manejo de archivos temporales
- Comandos específicos por sistema operativo
- Limpieza automática de archivos

#### `/api/qr/marcar-generados` (POST)
Marca asistentes como QR generados
- Actualiza estado en base de datos
- Notificación en tiempo real via Socket.io

### Tiempo Real
- **Evento**: `qr-masivo-generado`
- **Notificaciones**: Toast automáticas cuando otros usuarios generan QR masivos
- **Actualización**: Refrescos automáticos de listas

### Configuraciones de Calidad
- **QR**: 200px de ancho, margen 1px
- **PDF**: Formato A4, unidades en milímetros
- **Fuentes**: Helvetica con tamaños adaptativos
- **Márgenes**: 10mm estándar en todas las páginas

## Casos de Uso

### 1. Preparación Pre-Evento
```javascript
// Generar QR para todos los asistentes registrados
opciones = {
  incluirTodos: true,
  formatoImpresion: 'stickers',
  tamanoQR: 'mediano',
  incluyeNombre: true,
  incluyeEmpresa: true,
  copiasPorasistente: 2
}
```

### 2. QR para Asistentes Pendientes
```javascript
// Solo para quienes no han llegado
opciones = {
  incluirSoloNoPresentes: true,
  formatoImpresion: 'badges',
  enviarImpresora: true
}
```

### 3. QR por Empresa
```javascript
// Filtrar por empresa específica
opciones = {
  empresaFiltro: 'Universidad Nacional',
  formatoImpresion: 'tarjetas'
}
```

## Flujo de Trabajo

1. **Acceso**: `/qr-masivo` desde dashboard principal
2. **Configuración**: Selección de filtros y opciones
3. **Preview**: Vista previa de asistentes seleccionados
4. **Generación**: Creación del PDF optimizado
5. **Impresión**: Envío automático o descarga manual
6. **Notificación**: Alertas en tiempo real a todos los usuarios

## Beneficios

### ⚡ Eficiencia
- Generación de cientos de QR en segundos
- Eliminación de procesos manuales repetitivos
- Optimización para diferentes casos de uso

### 🎯 Precisión
- Filtros específicos evitan duplicados
- Seguimiento del estado de QR generados
- Información consistente en todos los códigos

### 🔄 Integración
- Sincronización con sistema de tiempo real
- Compatible con flujo de trabajo existente
- Notificaciones automáticas

### 📱 Flexibilidad
- Múltiples formatos de salida
- Adaptable a diferentes tipos de evento
- Configuración granular

## Próximas Mejoras Sugeridas

1. **Templates personalizados** con logos del evento
2. **Códigos QR con colores** corporativos
3. **Integración directa** con sistemas de impresión profesional
4. **Programación de impresión** automática
5. **Estadísticas de impresión** y uso

## Comandos del Sistema

### Windows
```powershell
# Listar impresoras
wmic printer get name /format:list

# Imprimir archivo
Start-Process -FilePath 'archivo.pdf' -Verb Print
```

### macOS/Linux
```bash
# Listar impresoras
lpstat -p

# Imprimir archivo
lpr -P "Nombre_Impresora" archivo.pdf
```

## Notas Técnicas

- **Límite de QR por página**: Se calcula automáticamente según formato
- **Limpieza de archivos**: Los PDFs temporales se eliminan después de 5 segundos
- **Encoding QR**: JSON con ID, nombre y tipo de asistente
- **Compatibilidad**: Funciona con navegadores modernos
- **Rendimiento**: Optimizado para lotes de hasta 1000+ códigos QR

---

**Implementado en**: Proyecto Registros - Semana de la Minería  
**Fecha**: Diciembre 2024  
**Estado**: ✅ Funcional y probado 