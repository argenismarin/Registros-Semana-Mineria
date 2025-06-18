// Base de datos en memoria compartida entre todas las APIs
// En producción esto debería ser reemplazado por una base de datos real

interface Asistente {
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

class MemoryDatabase {
  private asistentes: Asistente[] = []

  // Obtener todos los asistentes
  getAsistentes(): Asistente[] {
    return this.asistentes
  }

  // Agregar un nuevo asistente
  addAsistente(asistente: Asistente): void {
    this.asistentes.push(asistente)
  }

  // Encontrar asistente por ID
  findAsistenteById(id: string): Asistente | undefined {
    return this.asistentes.find(a => a.id === id)
  }

  // Actualizar asistente
  updateAsistente(id: string, updates: Partial<Asistente>): Asistente | null {
    const index = this.asistentes.findIndex(a => a.id === id)
    if (index === -1) return null
    
    this.asistentes[index] = { ...this.asistentes[index], ...updates }
    return this.asistentes[index]
  }

  // Eliminar asistente
  deleteAsistente(id: string): boolean {
    const index = this.asistentes.findIndex(a => a.id === id)
    if (index === -1) return false
    
    this.asistentes.splice(index, 1)
    return true
  }

  // Buscar asistentes
  searchAsistentes(query: string): Asistente[] {
    const lowerQuery = query.toLowerCase()
    return this.asistentes.filter(a => 
      a.nombre.toLowerCase().includes(lowerQuery) ||
      (a.email && a.email.toLowerCase().includes(lowerQuery)) ||
      (a.cargo && a.cargo.toLowerCase().includes(lowerQuery)) ||
      (a.empresa && a.empresa.toLowerCase().includes(lowerQuery))
    )
  }

  // Obtener estadísticas
  getEstadisticas() {
    const total = this.asistentes.length
    const presentes = this.asistentes.filter(a => a.presente).length
    const pendientes = total - presentes
    const escarapelasImpresas = this.asistentes.filter(a => a.escarapelaImpresa).length

    return {
      total,
      presentes,
      pendientes,
      escarapelasImpresas
    }
  }
}

// Instancia singleton de la base de datos
const db = new MemoryDatabase()

export default db
export type { Asistente } 