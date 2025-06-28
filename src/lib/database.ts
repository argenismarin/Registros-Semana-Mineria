// Base de datos en memoria simple y funcional
export interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  horaLlegada?: string
  presente: boolean
  escarapelaImpresa: boolean
  fechaRegistro: string
  fechaImpresion?: string
  qrGenerado?: boolean
  fechaGeneracionQR?: string
  // Nuevos campos para control de sincronización
  ultimaModificacion?: string
  sincronizado?: boolean
  dispositivoOrigen?: string
}

interface OperacionConcurrente {
  id: string
  tipo: 'crear' | 'actualizar' | 'eliminar'
  asistenteId: string
  timestamp: string
  datos?: any
}

class DatabaseMemoria {
  private asistentes: Map<string, Asistente & { ultimaModificacion: string; sincronizado: boolean; dispositivoOrigen: string }> = new Map()
  private operacionesRecientes: OperacionConcurrente[] = []
  private maxOperacionesHistorial = 100
  private lastSyncTimestamp: string | null = null
  private pendingSyncQueue: Set<string> = new Set()
  
  // CACHE INDEFINIDO para modo offline-first
  private cacheTimestamp: number = 0
  private readonly CACHE_DURATION = Infinity // CACHE INDEFINIDO - solo manual sync
  private readonly CACHE_KEY = 'asistentes_cache'
  private isLoading = false
  private manualSyncMode = true // Modo offline-first activado

  constructor() {
    this.loadFromLocalStorage()
  }

  // Cargar cache desde localStorage si existe
  private loadFromLocalStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(this.CACHE_KEY)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.timestamp && (Date.now() - data.timestamp) < this.CACHE_DURATION) {
            console.log('📦 Cargando desde cache local:', data.asistentes.length, 'asistentes')
            data.asistentes.forEach((asistente: any) => {
              this.asistentes.set(asistente.id, asistente)
            })
            this.cacheTimestamp = data.timestamp
          }
        }
      }
    } catch (error) {
      console.error('Error cargando cache local:', error)
    }
  }

  // Guardar cache en localStorage
  private saveToLocalStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const data = {
          timestamp: this.cacheTimestamp,
          asistentes: Array.from(this.asistentes.values())
        }
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(data))
        console.log('💾 Cache guardado localmente:', data.asistentes.length, 'asistentes')
      }
    } catch (error) {
      console.error('Error guardando cache local:', error)
    }
  }

  // Verificar si el cache es válido (SIEMPRE válido en modo offline-first)
  isCacheValid(): boolean {
    if (this.manualSyncMode) {
      console.log(`🔒 MODO OFFLINE-FIRST: Cache siempre válido hasta sincronización manual`)
      return true
    }
    
    const cacheAge = Date.now() - this.cacheTimestamp
    const isValid = cacheAge < this.CACHE_DURATION
    console.log(`🕐 Cache ${isValid ? 'VÁLIDO' : 'EXPIRADO'} (${Math.round(cacheAge/1000)}s)`)
    return isValid
  }

  // Invalidar cache manualmente (para forzar sincronización)
  invalidateCache(): void {
    console.log('💥 Cache invalidado manualmente')
    this.cacheTimestamp = 0
  }

  // Activar/desactivar modo offline-first
  setOfflineMode(offline: boolean): void {
    this.manualSyncMode = offline
    console.log(`🔄 Modo offline-first: ${offline ? 'ACTIVADO' : 'DESACTIVADO'}`)
  }

  // Marcar cache como actualizado
  refreshCache(): void {
    this.cacheTimestamp = Date.now()
    this.saveToLocalStorage()
    console.log('🔄 Cache refrescado:', new Date(this.cacheTimestamp).toLocaleTimeString())
  }

  // Obtener todos los asistentes (con cache)
  getAllAsistentes(): Asistente[] {
    const asistentes = Array.from(this.asistentes.values()).map(a => ({
      id: a.id,
      nombre: a.nombre,
      email: a.email,
      cargo: a.cargo,
      empresa: a.empresa,
      presente: a.presente,
      escarapelaImpresa: a.escarapelaImpresa,
      fechaRegistro: a.fechaRegistro,
      horaLlegada: a.horaLlegada,
      fechaImpresion: a.fechaImpresion,
      qrGenerado: a.qrGenerado,
      fechaGeneracionQR: a.fechaGeneracionQR
    }))
    
    return asistentes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }

  // Reemplazar todos los asistentes (preservando cambios locales)
  replaceAllAsistentes(nuevosAsistentes: Asistente[]): void {
    console.log(`📊 Reemplazando ${nuevosAsistentes.length} asistentes (preservando ${this.pendingSyncQueue.size} pendientes)`)
    
    // Guardar cambios pendientes
    const pendientesData = new Map()
    this.pendingSyncQueue.forEach(id => {
      if (this.asistentes.has(id)) {
        pendientesData.set(id, this.asistentes.get(id))
      }
    })
    
    // Limpiar y repoblar
    this.asistentes.clear()
    
    const timestamp = new Date().toISOString()
    nuevosAsistentes.forEach(asistente => {
      this.asistentes.set(asistente.id, {
        ...asistente,
        ultimaModificacion: timestamp,
        sincronizado: true,
        dispositivoOrigen: 'sheets'
      })
    })
    
    // Restaurar cambios pendientes
    pendientesData.forEach((data, id) => {
      this.asistentes.set(id, data)
      console.log(`🔄 Restaurado cambio pendiente: ${data.nombre}`)
    })
    
    // Actualizar cache
    this.refreshCache()
    
    console.log(`✅ Base reemplazada: ${this.asistentes.size} total (${this.pendingSyncQueue.size} pendientes)`)
  }

  // Agregar asistente
  addAsistente(asistente: Asistente): void {
    const timestamp = new Date().toISOString()
    this.asistentes.set(asistente.id, {
      ...asistente,
      ultimaModificacion: timestamp,
      sincronizado: false,
      dispositivoOrigen: 'local'
    })
    this.pendingSyncQueue.add(asistente.id)
    this.saveToLocalStorage()
    console.log(`➕ Asistente agregado: ${asistente.nombre} (pendiente sincronización)`)
  }

  // Actualizar asistente
  updateAsistente(asistente: Asistente): void {
    const timestamp = new Date().toISOString()
    this.asistentes.set(asistente.id, {
      ...asistente,
      ultimaModificacion: timestamp,
      sincronizado: false,
      dispositivoOrigen: 'local'
    })
    this.pendingSyncQueue.add(asistente.id)
    this.saveToLocalStorage()
    console.log(`✏️ Asistente actualizado: ${asistente.nombre} (pendiente sincronización)`)
  }

  // Eliminar asistente
  deleteAsistente(id: string): boolean {
    const asistente = this.asistentes.get(id)
    if (asistente) {
      this.asistentes.delete(id)
      this.pendingSyncQueue.delete(id)
      this.saveToLocalStorage()
      console.log(`🗑️ Asistente eliminado: ${asistente.nombre}`)
      return true
    }
    return false
  }

  // Marcar como sincronizado
  markAsSynced(id: string): void {
    const asistente = this.asistentes.get(id)
    if (asistente) {
      asistente.sincronizado = true
      this.pendingSyncQueue.delete(id)
      this.saveToLocalStorage()
      console.log(`✅ Marcado como sincronizado: ${asistente.nombre}`)
    }
  }

  // Obtener asistentes pendientes de sincronización
  getPendingSyncAsistentes(): Asistente[] {
    return Array.from(this.pendingSyncQueue)
      .map(id => this.asistentes.get(id))
      .filter(Boolean)
      .map(a => ({
        id: a!.id,
        nombre: a!.nombre,
        email: a!.email,
        cargo: a!.cargo,
        empresa: a!.empresa,
        presente: a!.presente,
        escarapelaImpresa: a!.escarapelaImpresa,
        fechaRegistro: a!.fechaRegistro,
        horaLlegada: a!.horaLlegada,
        fechaImpresion: a!.fechaImpresion,
        qrGenerado: a!.qrGenerado,
        fechaGeneracionQR: a!.fechaGeneracionQR
      }))
  }

  // Estadísticas de sincronización
  getSyncStats(): { total: number; sincronizados: number; pendientes: number; cacheAge: number; cacheValid: boolean } {
    const total = this.asistentes.size
    const pendientes = this.pendingSyncQueue.size
    const sincronizados = total - pendientes
    const cacheAge = Date.now() - this.cacheTimestamp
    const cacheValid = this.isCacheValid()
    
    return {
      total,
      sincronizados,
      pendientes,
      cacheAge: Math.round(cacheAge / 1000),
      cacheValid
    }
  }

  // Limpiar cache (uso administrativo)
  clearCache(): void {
    this.cacheTimestamp = 0
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY)
    }
    console.log('🗑️ Cache limpiado')
  }

  // Estado de carga
  setLoading(loading: boolean): void {
    this.isLoading = loading
  }

  getLoadingState(): boolean {
    return this.isLoading
  }

  // Buscar asistente por ID
  findAsistenteById(id: string): Asistente | null {
    return this.asistentes.get(id) || null
  }

  // Marcar asistencia
  marcarAsistencia(id: string): Asistente | null {
    const asistente = this.asistentes.get(id)
    
    if (!asistente) {
      console.error(`❌ No se encontró asistente con ID: ${id}`)
      return null
    }

    if (asistente.presente) {
      console.log(`⚠️ ${asistente.nombre} ya está presente`)
      return asistente
    }

    asistente.presente = true
    asistente.horaLlegada = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    console.log(`✅ Asistencia marcada para ${asistente.nombre} a las ${asistente.horaLlegada}`)
    return asistente
  }

  // Marcar escarapela como impresa
  marcarEscarapelaImpresa(id: string): Asistente | null {
    const asistente = this.asistentes.get(id)
    
    if (!asistente) {
      console.error(`❌ No se encontró asistente con ID: ${id}`)
      return null
    }

    if (asistente.escarapelaImpresa) {
      console.log(`⚠️ Escarapela de ${asistente.nombre} ya está marcada como impresa`)
      return asistente
    }

    asistente.escarapelaImpresa = true
    asistente.fechaImpresion = new Date().toISOString()

    console.log(`🖨️ Escarapela de ${asistente.nombre} marcada como impresa`)
    return asistente
  }

  // Obtener estadísticas
  getEstadisticas() {
    const total = this.asistentes.size
    const presentes = Array.from(this.asistentes.values()).filter(a => a.presente).length
    const escarapelasImpresas = Array.from(this.asistentes.values()).filter(a => a.escarapelaImpresa).length
    const qrGenerados = Array.from(this.asistentes.values()).filter(a => a.qrGenerado).length

    const estadisticas = {
      total,
      presentes,
      ausentes: total - presentes,
      escarapelasImpresas,
      escarapelasPendientes: total - escarapelasImpresas,
      qrGenerados,
      qrPendientes: total - qrGenerados,
      porcentajeAsistencia: total > 0 ? Math.round((presentes / total) * 100) : 0,
      porcentajeEscarapelas: total > 0 ? Math.round((escarapelasImpresas / total) * 100) : 0
    }

    console.log(`📊 Estadísticas: ${presentes}/${total} presentes (${estadisticas.porcentajeAsistencia}%)`)
    return estadisticas
  }

  // Registrar operación para historial
  private registrarOperacion(tipo: 'crear' | 'actualizar' | 'eliminar', asistenteId: string, datos?: any) {
    const operacion: OperacionConcurrente = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      asistenteId,
      timestamp: new Date().toISOString(),
      datos
    }

    this.operacionesRecientes.unshift(operacion)
    
    // Mantener solo las últimas operaciones
    if (this.operacionesRecientes.length > this.maxOperacionesHistorial) {
      this.operacionesRecientes = this.operacionesRecientes.slice(0, this.maxOperacionesHistorial)
    }
  }

  // Obtener historial de operaciones recientes
  getOperacionesRecientes(limite = 10): OperacionConcurrente[] {
    return this.operacionesRecientes.slice(0, limite)
  }

  // Limpiar toda la base de datos
  limpiarTodo(): void {
    const cantidad = this.asistentes.size
    this.asistentes.clear()
    this.operacionesRecientes = []
    console.log(`🧹 Base de datos limpiada. ${cantidad} asistentes eliminados`)
  }

  // Obtener información del estado de la base de datos
  getEstado() {
    return {
      asistentes: this.asistentes.size,
      operacionesRecientes: this.operacionesRecientes.length,
      ultimaOperacion: this.operacionesRecientes[0]?.timestamp || 'Ninguna',
      memoria: {
        usada: process.memoryUsage ? process.memoryUsage().heapUsed : 'No disponible',
        total: process.memoryUsage ? process.memoryUsage().heapTotal : 'No disponible'
      }
    }
  }
}

// Instancia singleton
const db = new DatabaseMemoria()

// Función para inicializar con datos de prueba (opcional)
export function inicializarDatosPrueba() {
  console.log('🔄 Inicializando datos de prueba...')
  
  const datosPrueba: Asistente[] = [
    {
      id: 'test-1',
      nombre: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      cargo: 'Desarrollador',
      empresa: 'Tech Corp',
      presente: false,
      escarapelaImpresa: false,
      fechaRegistro: new Date().toISOString(),
      qrGenerado: false
    },
    {
      id: 'test-2',
      nombre: 'María García',
      email: 'maria@ejemplo.com',
      cargo: 'Diseñadora',
      empresa: 'Design Studio',
      presente: true,
      escarapelaImpresa: true,
      fechaRegistro: new Date().toISOString(),
      horaLlegada: '09:30:00',
      fechaImpresion: new Date().toISOString(),
      qrGenerado: true,
      fechaGeneracionQR: new Date().toISOString()
    }
  ]

  datosPrueba.forEach(asistente => db.addAsistente(asistente))
  console.log(`✅ ${datosPrueba.length} asistentes de prueba agregados`)
}

export default db
export type { OperacionConcurrente } 