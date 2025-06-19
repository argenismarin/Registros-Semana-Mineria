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
}

interface OperacionConcurrente {
  id: string
  tipo: 'crear' | 'actualizar' | 'eliminar'
  asistenteId: string
  timestamp: string
  datos?: any
}

class MemoryDatabase {
  private asistentes: Asistente[] = []
  private operacionesRecientes: OperacionConcurrente[] = []
  private maxOperacionesHistorial = 100

  // Obtener todos los asistentes
  getAsistentes(): Asistente[] {
    console.log(`📊 Obteniendo ${this.asistentes.length} asistentes de la base de datos`)
    return [...this.asistentes] // Retornar copia para evitar mutaciones
  }

  // Buscar asistente por ID
  findAsistenteById(id: string): Asistente | undefined {
    const asistente = this.asistentes.find(a => a.id === id)
    if (asistente) {
      console.log(`🔍 Asistente encontrado: ${asistente.nombre}`)
    } else {
      console.log(`❌ No se encontró asistente con ID: ${id}`)
    }
    return asistente
  }

  // Agregar nuevo asistente
  addAsistente(asistente: Asistente): void {
    console.log(`➕ Agregando asistente: ${asistente.nombre}`)
    
    // Verificar que no existe
    const existe = this.asistentes.find(a => a.id === asistente.id)
    if (existe) {
      console.warn(`⚠️ Ya existe asistente con ID: ${asistente.id}`)
      return
    }

    this.asistentes.push(asistente)
    this.registrarOperacion('crear', asistente.id, { asistente })
    
    console.log(`✅ Asistente ${asistente.nombre} agregado. Total: ${this.asistentes.length}`)
  }

  // Actualizar asistente existente
  updateAsistente(id: string, updateData: Partial<Asistente>): Asistente | null {
    const index = this.asistentes.findIndex(a => a.id === id)
    
    if (index === -1) {
      console.error(`❌ No se encontró asistente con ID: ${id} para actualizar`)
      return null
    }

    const asistenteAnterior = { ...this.asistentes[index] }
    this.asistentes[index] = {
      ...this.asistentes[index],
      ...updateData
    }

    this.registrarOperacion('actualizar', id, { 
      anterior: asistenteAnterior, 
      nuevo: this.asistentes[index] 
    })

    console.log(`✅ Asistente ${this.asistentes[index].nombre} actualizado`)
    return this.asistentes[index]
  }

  // Eliminar asistente
  deleteAsistente(id: string): boolean {
    const index = this.asistentes.findIndex(a => a.id === id)
    
    if (index === -1) {
      console.error(`❌ No se encontró asistente con ID: ${id} para eliminar`)
      return false
    }
    
    const asistenteEliminado = this.asistentes[index]
    this.asistentes.splice(index, 1)
    
    this.registrarOperacion('eliminar', id, { asistente: asistenteEliminado })
    
    console.log(`🗑️ Asistente ${asistenteEliminado.nombre} eliminado. Total: ${this.asistentes.length}`)
    return true
  }

  // Buscar asistentes
  searchAsistentes(query: string): Asistente[] {
    if (!query || query.trim() === '') {
      return this.getAsistentes()
    }

    const lowerQuery = query.toLowerCase().trim()
    const resultados = this.asistentes.filter(a => 
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
    const asistente = this.asistentes.find(a => a.id === id)
    
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
    const asistente = this.asistentes.find(a => a.id === id)
    
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
    const total = this.asistentes.length
    const presentes = this.asistentes.filter(a => a.presente).length
    const escarapelasImpresas = this.asistentes.filter(a => a.escarapelaImpresa).length
    const qrGenerados = this.asistentes.filter(a => a.qrGenerado).length

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
    const cantidad = this.asistentes.length
    this.asistentes = []
    this.operacionesRecientes = []
    console.log(`🧹 Base de datos limpiada. ${cantidad} asistentes eliminados`)
  }

  // Obtener información del estado de la base de datos
  getEstado() {
    return {
      asistentes: this.asistentes.length,
      operacionesRecientes: this.operacionesRecientes.length,
      ultimaOperacion: this.operacionesRecientes[0]?.timestamp || 'Ninguna',
      memoria: {
        usada: process.memoryUsage ? process.memoryUsage().heapUsed : 'No disponible',
        total: process.memoryUsage ? process.memoryUsage().heapTotal : 'No disponible'
      }
    }
  }
}

// Instancia única de la base de datos
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