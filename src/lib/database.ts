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

class MemoryDatabase {
  private asistentes: Map<string, Asistente> = new Map()
  private operacionesRecientes: OperacionConcurrente[] = []
  private maxOperacionesHistorial = 100
  private lastSyncTimestamp: string | null = null
  private pendingSyncQueue: Set<string> = new Set() // IDs pendientes de sincronización

  // Obtener todos los asistentes
  getAsistentes(): Asistente[] {
    return Array.from(this.asistentes.values()).sort((a, b) => 
      a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
    )
  }

  // Buscar asistente por ID
  findAsistenteById(id: string): Asistente | null {
    return this.asistentes.get(id) || null
  }

  // Agregar asistente
  addAsistente(asistente: Asistente): Asistente {
    const asistenteConMetadata: Asistente = {
      ...asistente,
      ultimaModificacion: new Date().toISOString(),
      sincronizado: false,
      dispositivoOrigen: 'local'
    }
    
    this.asistentes.set(asistente.id, asistenteConMetadata)
    this.pendingSyncQueue.add(asistente.id)
    
    console.log(`➕ Asistente agregado a memoria: ${asistente.nombre}`)
    return asistenteConMetadata
  }

  // Actualizar asistente con manejo de conflictos
  updateAsistente(id: string, datosActualizacion: Partial<Asistente>): Asistente | null {
    const asistenteExistente = this.asistentes.get(id)
    if (!asistenteExistente) {
      console.error(`❌ Asistente ${id} no encontrado para actualizar`)
      return null
    }

    const asistenteActualizado: Asistente = {
      ...asistenteExistente,
      ...datosActualizacion,
      ultimaModificacion: new Date().toISOString(),
      sincronizado: false,
      dispositivoOrigen: 'local'
    }

    this.asistentes.set(id, asistenteActualizado)
    this.pendingSyncQueue.add(id)
    
    console.log(`✏️ Asistente actualizado en memoria: ${asistenteActualizado.nombre}`)
    return asistenteActualizado
  }

  // Eliminar asistente
  deleteAsistente(id: string): boolean {
    const eliminado = this.asistentes.delete(id)
    if (eliminado) {
      this.pendingSyncQueue.delete(id)
      console.log(`🗑️ Asistente eliminado de memoria: ${id}`)
    }
    return eliminado
  }

  // Reemplazar todos los asistentes (para sincronización desde Google Sheets)
  replaceAllAsistentes(asistentes: Asistente[], preservarCambiosLocales = true): void {
    console.log(`🔄 Reemplazando ${this.asistentes.size} asistentes con ${asistentes.length} de Google Sheets`)
    
    // Si hay cambios locales pendientes, preservarlos
    const cambiosLocalesPendientes = new Map<string, Asistente>()
    
    if (preservarCambiosLocales) {
      this.pendingSyncQueue.forEach(id => {
        const asistenteLocal = this.asistentes.get(id)
        if (asistenteLocal && !asistenteLocal.sincronizado) {
          cambiosLocalesPendientes.set(id, asistenteLocal)
          console.log(`💾 Preservando cambio local pendiente: ${asistenteLocal.nombre}`)
        }
      })
    }

    // Limpiar y recargar
    this.asistentes.clear()
    
    // Agregar asistentes de Google Sheets
    asistentes.forEach(asistente => {
      const asistenteConMetadata: Asistente = {
        ...asistente,
        ultimaModificacion: asistente.ultimaModificacion || asistente.fechaRegistro,
        sincronizado: true,
        dispositivoOrigen: 'sheets'
      }
      this.asistentes.set(asistente.id, asistenteConMetadata)
    })

    // Restaurar cambios locales pendientes (tienen prioridad)
    cambiosLocalesPendientes.forEach((asistenteLocal, id) => {
      this.asistentes.set(id, asistenteLocal)
      console.log(`🔄 Restaurado cambio local: ${asistenteLocal.nombre}`)
    })

    this.lastSyncTimestamp = new Date().toISOString()
    console.log(`✅ Base de datos actualizada con ${this.asistentes.size} asistentes`)
  }

  // Marcar asistente como sincronizado
  markAsSynced(id: string): void {
    const asistente = this.asistentes.get(id)
    if (asistente) {
      asistente.sincronizado = true
      this.asistentes.set(id, asistente)
      this.pendingSyncQueue.delete(id)
      console.log(`✅ Asistente marcado como sincronizado: ${asistente.nombre}`)
    }
  }

  // Obtener asistentes pendientes de sincronización
  getPendingSyncAsistentes(): Asistente[] {
    return Array.from(this.pendingSyncQueue)
      .map(id => this.asistentes.get(id))
      .filter((asistente): asistente is Asistente => asistente !== undefined)
  }

  // Obtener estadísticas de sincronización
  getSyncStats(): {
    total: number
    sincronizados: number
    pendientes: number
    lastSync: string | null
  } {
    const total = this.asistentes.size
    const sincronizados = Array.from(this.asistentes.values())
      .filter(a => a.sincronizado).length
    
    return {
      total,
      sincronizados,
      pendientes: this.pendingSyncQueue.size,
      lastSync: this.lastSyncTimestamp
    }
  }

  // Limpiar cola de sincronización
  clearSyncQueue(): void {
    this.pendingSyncQueue.clear()
    console.log('🧹 Cola de sincronización limpiada')
  }

  // Verificar si hay cambios locales pendientes
  hasPendingChanges(): boolean {
    return this.pendingSyncQueue.size > 0
  }

  // Método para debugging
  debugInfo(): any {
    return {
      totalAsistentes: this.asistentes.size,
      pendientesSync: this.pendingSyncQueue.size,
      lastSync: this.lastSyncTimestamp,
      asistentesIds: Array.from(this.asistentes.keys()),
      pendientesIds: Array.from(this.pendingSyncQueue)
    }
  }

  // Buscar asistentes
  searchAsistentes(query: string): Asistente[] {
    if (!query || query.trim() === '') {
      return this.getAsistentes()
    }

    const lowerQuery = query.toLowerCase().trim()
    const resultados = this.getAsistentes().filter(a => 
      a.nombre.toLowerCase().includes(lowerQuery) ||
      (a.email && a.email.toLowerCase().includes(lowerQuery)) ||
      (a.cargo && a.cargo.toLowerCase().includes(lowerQuery)) ||
      (a.empresa && a.empresa.toLowerCase().includes(lowerQuery))
    )

    console.log(`🔍 Búsqueda "${query}": ${resultados.length} resultados`)
    return resultados
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
const db = new MemoryDatabase()

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