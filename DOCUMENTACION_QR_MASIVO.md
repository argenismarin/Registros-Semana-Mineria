# Documentación Técnica: Generación Masiva de Códigos QR

## 🎯 Objetivo
Documentar la lógica completa para generar masivamente códigos QR en formato PDF optimizado para impresión, con múltiples configuraciones de formato y layout.

## 📋 Estructura de Datos del QR

### Contenido del Código QR
Cada código QR contiene un JSON estructurado:

```json
{
  "id": "asistente-123",           // ID único del asistente
  "nombre": "Juan Pérez",          // Nombre para validación visual
  "tipo": "asistente"              // Tipo de QR (siempre "asistente")
}
```

### Estructura del Asistente
```typescript
interface Asistente {
  id: string                    // ID único
  nombre: string               // Nombre completo
  email?: string              // Email (opcional)
  cargo?: string              // Posición/cargo (opcional)
  empresa?: string            // Organización (opcional)
  presente: boolean           // Estado de asistencia
  qrGenerado?: boolean        // Si ya tiene QR generado
}
```

## ⚙️ Configuraciones de Generación

### Opciones de Generación Masiva
```typescript
interface OpcionesQR {
  // === FILTROS DE ASISTENTES ===
  incluirTodos: boolean                // true = todos los asistentes
  incluirSoloNoPresentes: boolean      // true = solo ausentes
  incluirSoloPendientesQR: boolean     // true = solo sin QR previo
  empresaFiltro: string                // Filtrar por empresa específica
  
  // === FORMATO DE IMPRESIÓN ===
  formatoImpresion: 'stickers' | 'tarjetas' | 'badges' | 'custom'
  
  // === CONFIGURACIÓN VISUAL ===
  tamanoQR: 'pequeno' | 'mediano' | 'grande'  // 2cm, 3cm, 4cm
  incluyeNombre: boolean               // Mostrar nombre bajo QR
  incluyeEmpresa: boolean              // Mostrar empresa bajo QR
  incluyeCargo: boolean                // Mostrar cargo bajo QR
  
  // === LAYOUT DE PÁGINA ===
  copiasPorasistente: number           // 1-10 copias por persona
  columnas: number                     // Columnas por página A4
  filas: number                        // Filas por página A4
}
```

### Configuraciones de Formato Predefinidas
```typescript
const configuraciones = {
  stickers: {
    ancho: 50,              // mm - Stickers circulares 5x5cm
    alto: 50,               // mm
    qrSize: { 
      pequeno: 20,          // mm - QR pequeño
      mediano: 25,          // mm - QR mediano  
      grande: 30            // mm - QR grande
    },
    margen: 5,              // mm - Margen interno
    fontSizeNombre: 8,      // pt - Tamaño fuente nombre
    fontSizeInfo: 6,        // pt - Tamaño fuente info adicional
    descripcion: 'Ideales para adherir a gafetes'
  },
  
  tarjetas: {
    ancho: 85,              // mm - Formato tarjeta de visita
    alto: 55,               // mm
    qrSize: { 
      pequeno: 25, 
      mediano: 30, 
      grande: 35 
    },
    margen: 8,
    fontSizeNombre: 10,
    fontSizeInfo: 8,
    descripcion: 'Formato profesional tipo tarjeta'
  },
  
  badges: {
    ancho: 100,             // mm - Badges corporativos
    alto: 70,               // mm
    qrSize: { 
      pequeno: 30, 
      mediano: 40, 
      grande: 50 
    },
    margen: 10,
    fontSizeNombre: 12,
    fontSizeInfo: 10,
    descripcion: 'Con información completa del asistente'
  },
  
  custom: {
    ancho: 70,              // mm - Configuración personalizable
    alto: 50,               // mm
    qrSize: { 
      pequeno: 20, 
      mediano: 25, 
      grande: 30 
    },
    margen: 5,
    fontSizeNombre: 9,
    fontSizeInfo: 7,
    descripcion: 'Dimensiones configurables manualmente'
  }
}
```

## 🧮 Algoritmos de Posicionamiento

### Cálculos de Página A4
```typescript
// Constantes de página A4 en milímetros
const PAGE_WIDTH = 210    // mm
const PAGE_HEIGHT = 297   // mm
const MARGIN_X = 10       // mm - Margen izquierdo/derecho
const MARGIN_Y = 10       // mm - Margen superior/inferior

// Área utilizable
const USABLE_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)    // 190mm
const USABLE_HEIGHT = PAGE_HEIGHT - (MARGIN_Y * 2)  // 277mm

// Cálculo de espaciado entre elementos
function calcularEspaciado(columnas: number, filas: number) {
  const spacingX = USABLE_WIDTH / columnas   // Ancho por columna
  const spacingY = USABLE_HEIGHT / filas     // Alto por fila
  
  return { spacingX, spacingY }
}

// Cálculo de items por página
function calcularItemsPorPagina(columnas: number, filas: number): number {
  return columnas * filas
}
```

### Algoritmo de Posicionamiento de Items
```typescript
function calcularPosicionItem(
  index: number,           // Índice del item actual
  columnas: number,        // Número de columnas
  spacingX: number,        // Espaciado horizontal
  spacingY: number,        // Espaciado vertical
  marginX: number,         // Margen izquierdo
  marginY: number          // Margen superior
) {
  // Índice dentro de la página actual
  const itemsEnPagina = index % (columnas * Math.floor(USABLE_HEIGHT / spacingY))
  
  // Posición en grid
  const columnaActual = itemsEnPagina % columnas
  const filaActual = Math.floor(itemsEnPagina / columnas)
  
  // Coordenadas absolutas en mm
  const itemX = marginX + (columnaActual * spacingX)
  const itemY = marginY + (filaActual * spacingY)
  
  return { itemX, itemY, columnaActual, filaActual }
}
```

### Lógica de Paginación
```typescript
function necesitaNuevaPagina(
  index: number,           // Índice actual
  itemsPorPagina: number   // Items que caben por página
): boolean {
  return index > 0 && (index % itemsPorPagina === 0)
}
```

## 🎨 Generación de Código QR

### Configuración de QR con qrcode.js
```typescript
async function generarQRDataURL(asistenteData: any): Promise<string> {
  const qrData = JSON.stringify({
    id: asistenteData.id,
    nombre: asistenteData.nombre,
    tipo: 'asistente'
  })
  
  const qrDataURL = await QRCode.toDataURL(qrData, {
    width: 200,              // Resolución en píxeles
    margin: 1,               // Margen en módulos QR
    color: {
      dark: '#000000',       // Color negro para el QR
      light: '#FFFFFF'       // Fondo blanco
    },
    errorCorrectionLevel: 'M'  // Nivel medio de corrección
  })
  
  return qrDataURL
}
```

### Cálculo de Posición del QR dentro del Item
```typescript
function calcularPosicionQR(
  itemX: number,           // X del contenedor
  itemY: number,           // Y del contenedor
  anchoItem: number,       // Ancho del contenedor
  altoItem: number,        // Alto del contenedor
  tamanoQR: number,        // Tamaño del QR en mm
  margenSuperior: number   // Margen superior dentro del item
) {
  // Centrar horizontalmente
  const qrX = itemX + (anchoItem - tamanoQR) / 2
  
  // Posicionar en parte superior con margen
  const qrY = itemY + margenSuperior
  
  return { qrX, qrY }
}
```

## 📝 Posicionamiento de Texto

### Cálculo de Posición de Texto
```typescript
function calcularPosicionTexto(
  itemX: number,           // X del contenedor
  qrY: number,             // Y del QR
  tamanoQR: number,        // Tamaño del QR
  anchoItem: number,       // Ancho del contenedor
  textoAncho: number,      // Ancho del texto calculado
  espacioEntreLineas: number // Espaciado entre líneas
) {
  // X centrado horizontalmente
  const textX = itemX + (anchoItem - textoAncho) / 2
  
  // Y debajo del QR con espacio
  const textY = qrY + tamanoQR + espacioEntreLineas
  
  return { textX, textY }
}
```

### Truncamiento de Texto
```typescript
function truncarTexto(
  texto: string,
  longitudMaxima: number
): string {
  if (texto.length <= longitudMaxima) {
    return texto
  }
  
  return texto.substring(0, longitudMaxima - 3) + '...'
}

// Ejemplos de uso:
const nombreTruncado = truncarTexto(asistente.nombre, 20)
const empresaTruncada = truncarTexto(asistente.empresa || '', 25)
const cargoTruncado = truncarTexto(asistente.cargo || '', 25)
```

## 🔧 Algoritmo Principal de Generación

### Función Completa de Generación
```typescript
async function generarPDFMasivo(
  asistentes: Asistente[],
  opciones: OpcionesQR
): Promise<ArrayBuffer> {
  
  // 1. CONFIGURACIÓN INICIAL
  const config = configuraciones[opciones.formatoImpresion]
  const qrSize = config.qrSize[opciones.tamanoQR]
  
  // Crear documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // 2. CÁLCULOS DE LAYOUT
  const spacingX = USABLE_WIDTH / opciones.columnas
  const spacingY = USABLE_HEIGHT / opciones.filas
  const itemsPorPagina = opciones.columnas * opciones.filas
  
  // 3. GENERAR INSTANCIAS (CONSIDERANDO COPIAS)
  const instancias: Asistente[] = []
  asistentes.forEach(asistente => {
    for (let i = 0; i < opciones.copiasPorasistente; i++) {
      instancias.push(asistente)
    }
  })
  
  // 4. PROCESAR CADA INSTANCIA
  for (let index = 0; index < instancias.length; index++) {
    const asistente = instancias[index]
    
    // 4a. NUEVA PÁGINA SI ES NECESARIO
    if (necesitaNuevaPagina(index, itemsPorPagina)) {
      doc.addPage()
    }
    
    // 4b. CALCULAR POSICIÓN DEL ITEM
    const { itemX, itemY } = calcularPosicionItem(
      index, opciones.columnas, spacingX, spacingY, MARGIN_X, MARGIN_Y
    )
    
    // 4c. DIBUJAR BORDE DEL ITEM (OPCIONAL)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.1)
    doc.rect(itemX, itemY, config.ancho, config.alto)
    
    // 4d. GENERAR Y POSICIONAR QR
    const qrDataURL = await generarQRDataURL(asistente)
    const { qrX, qrY } = calcularPosicionQR(
      itemX, itemY, config.ancho, config.alto, qrSize, config.margen
    )
    
    doc.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize)
    
    // 4e. AGREGAR TEXTO INFORMATIVO
    let textY = qrY + qrSize + 5  // Posición Y inicial del texto
    
    // Nombre
    if (opciones.incluyeNombre) {
      doc.setFontSize(config.fontSizeNombre)
      doc.setFont('helvetica', 'bold')
      
      const nombreMostrar = truncarTexto(asistente.nombre, 20)
      const textWidth = doc.getTextWidth(nombreMostrar)
      const { textX } = calcularPosicionTexto(
        itemX, qrY, qrSize, config.ancho, textWidth, 5
      )
      
      doc.text(nombreMostrar, textX, textY)
      textY += 4  // Incrementar Y para siguiente línea
    }
    
    // Empresa
    if (opciones.incluyeEmpresa && asistente.empresa) {
      doc.setFontSize(config.fontSizeInfo)
      doc.setFont('helvetica', 'normal')
      
      const empresaMostrar = truncarTexto(asistente.empresa, 25)
      const textWidth = doc.getTextWidth(empresaMostrar)
      const { textX } = calcularPosicionTexto(
        itemX, qrY, qrSize, config.ancho, textWidth, 5
      )
      
      doc.text(empresaMostrar, textX, textY)
      textY += 3
    }
    
    // Cargo
    if (opciones.incluyeCargo && asistente.cargo) {
      doc.setFontSize(config.fontSizeInfo)
      doc.setFont('helvetica', 'normal')
      
      const cargoMostrar = truncarTexto(asistente.cargo, 25)
      const textWidth = doc.getTextWidth(cargoMostrar)
      const { textX } = calcularPosicionTexto(
        itemX, qrY, qrSize, config.ancho, textWidth, 5
      )
      
      doc.text(cargoMostrar, textX, textY)
    }
  }
  
  // 5. RETORNAR PDF COMO ARRAY BUFFER
  return doc.output('arraybuffer')
}
```

## 🔍 Algoritmo de Filtrado

### Filtrado de Asistentes
```typescript
function filtrarAsistentes(
  asistentes: Asistente[],
  opciones: OpcionesQR
): Asistente[] {
  let filtrados = [...asistentes]
  
  // Filtro: Solo no presentes
  if (opciones.incluirSoloNoPresentes) {
    filtrados = filtrados.filter(a => !a.presente)
  }
  
  // Filtro: Solo pendientes de QR
  if (opciones.incluirSoloPendientesQR) {
    filtrados = filtrados.filter(a => !a.qrGenerado)
  }
  
  // Filtro: Por empresa específica
  if (opciones.empresaFiltro && opciones.empresaFiltro.trim() !== '') {
    filtrados = filtrados.filter(a => 
      a.empresa?.toLowerCase().includes(opciones.empresaFiltro.toLowerCase())
    )
  }
  
  return filtrados
}
```

## 📊 Optimizaciones de Rendimiento

### Generación Asíncrona de QRs
```typescript
async function generarQRsBatch(
  asistentes: Asistente[],
  batchSize: number = 50
): Promise<Map<string, string>> {
  const qrCache = new Map<string, string>()
  
  // Procesar en lotes para evitar bloqueo
  for (let i = 0; i < asistentes.length; i += batchSize) {
    const batch = asistentes.slice(i, i + batchSize)
    
    const qrPromises = batch.map(async (asistente) => {
      const qrDataURL = await generarQRDataURL(asistente)
      return { id: asistente.id, qrDataURL }
    })
    
    const results = await Promise.all(qrPromises)
    results.forEach(({ id, qrDataURL }) => {
      qrCache.set(id, qrDataURL)
    })
    
    // Pequeña pausa para no saturar
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  
  return qrCache
}
```

### Cálculo de Layout Optimizado
```typescript
function calcularLayoutOptimo(
  totalItems: number,
  anchoItem: number,
  altoItem: number
): { columnas: number, filas: number, paginas: number } {
  
  const maxColumnas = Math.floor(USABLE_WIDTH / anchoItem)
  const maxFilas = Math.floor(USABLE_HEIGHT / altoItem)
  const itemsPorPagina = maxColumnas * maxFilas
  
  const paginas = Math.ceil(totalItems / itemsPorPagina)
  
  return {
    columnas: maxColumnas,
    filas: maxFilas,
    paginas
  }
}
```

## 🎛️ Configuraciones Avanzadas

### Layout Dinámico según Contenido
```typescript
function ajustarLayoutSegunContenido(
  opciones: OpcionesQR
): { columnas: number, filas: number } {
  
  const config = configuraciones[opciones.formatoImpresion]
  
  // Calcular columnas y filas óptimas
  const columnasOptimas = Math.floor(USABLE_WIDTH / config.ancho)
  const filasOptimas = Math.floor(USABLE_HEIGHT / config.alto)
  
  // Usar configuración manual si se especifica
  const columnas = opciones.columnas || columnasOptimas
  const filas = opciones.filas || filasOptimas
  
  return { columnas, filas }
}
```

### Validación de Configuraciones
```typescript
function validarOpciones(opciones: OpcionesQR): string[] {
  const errores: string[] = []
  
  // Validar formato
  if (!['stickers', 'tarjetas', 'badges', 'custom'].includes(opciones.formatoImpresion)) {
    errores.push('Formato de impresión inválido')
  }
  
  // Validar tamaño QR
  if (!['pequeno', 'mediano', 'grande'].includes(opciones.tamanoQR)) {
    errores.push('Tamaño de QR inválido')
  }
  
  // Validar copias
  if (opciones.copiasPorasistente < 1 || opciones.copiasPorasistente > 10) {
    errores.push('Número de copias debe estar entre 1 y 10')
  }
  
  // Validar layout
  if (opciones.columnas && (opciones.columnas < 1 || opciones.columnas > 10)) {
    errores.push('Número de columnas inválido')
  }
  
  if (opciones.filas && (opciones.filas < 1 || opciones.filas > 20)) {
    errores.push('Número de filas inválido')
  }
  
  return errores
}
```

## 📋 Casos de Uso Específicos

### Caso 1: Stickers para Gafetes
```typescript
const opcionesStickers: OpcionesQR = {
  incluirTodos: true,
  formatoImpresion: 'stickers',
  tamanoQR: 'mediano',
  incluyeNombre: true,
  incluyeEmpresa: false,
  incluyeCargo: false,
  copiasPorasistente: 1,
  columnas: 4,  // 4 stickers por fila
  filas: 12     // 12 filas por página = 48 stickers por página
}
```

### Caso 2: Tarjetas de Identificación
```typescript
const opcionesTarjetas: OpcionesQR = {
  incluirSoloNoPresentes: true,
  formatoImpresion: 'tarjetas',
  tamanoQR: 'grande',
  incluyeNombre: true,
  incluyeEmpresa: true,
  incluyeCargo: true,
  copiasPorasistente: 1,
  columnas: 2,  // 2 tarjetas por fila
  filas: 5      // 5 filas por página = 10 tarjetas por página
}
```

### Caso 3: Badges Corporativos
```typescript
const opcionesBadges: OpcionesQR = {
  empresaFiltro: 'Universidad Nacional',
  formatoImpresion: 'badges',
  tamanoQR: 'grande',
  incluyeNombre: true,
  incluyeEmpresa: true,
  incluyeCargo: true,
  copiasPorasistente: 2,
  columnas: 2,  // 2 badges por fila
  filas: 4      // 4 filas por página = 8 badges por página
}
```

## 📐 Fórmulas Matemáticas Clave

### Cálculo de Posición en Grid
```
itemX = marginX + (columnaActual * spacingX)
itemY = marginY + (filaActual * spacingY)

donde:
- columnaActual = itemIndex % numeroColumnas
- filaActual = Math.floor(itemIndex / numeroColumnas)
- spacingX = anchoPagina / numeroColumnas
- spacingY = altoPagina / numeroFilas
```

### Centrado de Elementos
```
// Centrado horizontal
centroX = itemX + (anchoItem - anchoElemento) / 2

// Centrado vertical
centroY = itemY + (altoItem - altoElemento) / 2
```

### Cálculo de Páginas Necesarias
```
totalInstancias = asistentes.length * copiasPorasistente
itemsPorPagina = columnas * filas
totalPaginas = Math.ceil(totalInstancias / itemsPorPagina)
```

## ✅ Checklist de Implementación

### Dependencias Requeridas
- [ ] `qrcode` - Generación de códigos QR
- [ ] `jspdf` - Generación de documentos PDF
- [ ] Sistema de tipos TypeScript (opcional pero recomendado)

### Funciones Principales a Implementar
- [ ] `generarQRDataURL()` - Generar QR individual
- [ ] `calcularPosicionItem()` - Posicionamiento en grid
- [ ] `calcularPosicionQR()` - Centrado de QR en item
- [ ] `calcularPosicionTexto()` - Posicionamiento de texto
- [ ] `truncarTexto()` - Truncamiento de texto largo
- [ ] `filtrarAsistentes()` - Aplicar filtros
- [ ] `validarOpciones()` - Validar configuración
- [ ] `generarPDFMasivo()` - Función principal

### Configuraciones a Definir
- [ ] Configuraciones de formato (stickers, tarjetas, badges)
- [ ] Constantes de página A4
- [ ] Parámetros de QR (resolución, colores, corrección)
- [ ] Límites y validaciones

### Flujo de Trabajo de Implementación
1. **Configurar dependencias** - Instalar librerías necesarias
2. **Definir interfaces** - Crear tipos TypeScript
3. **Implementar generación QR** - Función básica de QR
4. **Crear algoritmos de posición** - Cálculos matemáticos
5. **Implementar filtrado** - Lógica de selección de asistentes
6. **Desarrollar función principal** - Integrar todo en PDF
7. **Agregar validaciones** - Verificar configuraciones
8. **Optimizar rendimiento** - Procesamiento en lotes
9. **Pruebas exhaustivas** - Verificar todos los formatos
10. **Documentar API** - Documentar uso para usuarios finales

---

**Esta documentación contiene toda la lógica necesaria para implementar un generador masivo de códigos QR en cualquier plataforma que soporte JavaScript/TypeScript y generación de PDFs.**
