// Base de datos en memoria optimizada para Vercel
// En un entorno serverless, cada función es independiente

export interface Asistente {
  id: string
  nombre: string
  cedula: string
  email: string
  telefono: string
  empresa: string
  cargo: string
  asistio: boolean
  horaLlegada?: string
  qrGenerado: boolean
  fechaRegistro: string
}

export interface Evento {
  nombre: string
  fecha: string
  lugar: string
  descripcion: string
  capacidadMaxima: number
}

// En Vercel, usamos una base de datos distribuida
// Cada función lambda mantiene su estado temporalmente
class DatabaseManager {
  private static instance: DatabaseManager
  private asistentes: Map<string, Asistente> = new Map()
  private evento: Evento | null = null
  private lastSync: number = 0
  private readonly SYNC_INTERVAL = 30000 // 30 segundos

  private constructor() {
    // Inicializar con datos de ejemplo si no hay datos
    this.initializeDefaultData()
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  private initializeDefaultData() {
    if (this.asistentes.size === 0) {
      // Datos de ejemplo para desarrollo
      const ejemploAsistente: Asistente = {
        id: '1',
        nombre: 'Usuario Ejemplo',
        cedula: '12345678',
        email: 'ejemplo@email.com',
        telefono: '3001234567',
        empresa: 'Empresa Ejemplo',
        cargo: 'Cargo Ejemplo',
        asistio: false,
        qrGenerado: false,
        fechaRegistro: new Date().toISOString()
      }
      this.asistentes.set('1', ejemploAsistente)
    }

    if (!this.evento) {
      this.evento = {
        nombre: 'Evento de Prueba',
        fecha: new Date().toISOString().split('T')[0],
        lugar: 'Lugar Virtual',
        descripcion: 'Evento de ejemplo para demostración',
        capacidadMaxima: 100
      }
    }
  }

  // Métodos para asistentes
  async getAllAsistentes(): Promise<Asistente[]> {
    return Array.from(this.asistentes.values())
  }

  async getAsistenteById(id: string): Promise<Asistente | undefined> {
    return this.asistentes.get(id)
  }

  async createAsistente(data: Omit<Asistente, 'id' | 'fechaRegistro'>): Promise<Asistente> {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const asistente: Asistente = {
      ...data,
      id,
      fechaRegistro: new Date().toISOString()
    }
    
    this.asistentes.set(id, asistente)
    return asistente
  }

  async updateAsistente(id: string, data: Partial<Asistente>): Promise<Asistente | null> {
    const asistente = this.asistentes.get(id)
    if (!asistente) return null

    const updatedAsistente = { ...asistente, ...data }
    this.asistentes.set(id, updatedAsistente)
    return updatedAsistente
  }

  async deleteAsistente(id: string): Promise<boolean> {
    return this.asistentes.delete(id)
  }

  async marcarAsistencia(id: string): Promise<Asistente | null> {
    const asistente = this.asistentes.get(id)
    if (!asistente) return null

    const updatedAsistente = {
      ...asistente,
      asistio: true,
      horaLlegada: new Date().toISOString()
    }
    
    this.asistentes.set(id, updatedAsistente)
    return updatedAsistente
  }

  async marcarQRGenerado(id: string): Promise<boolean> {
    const asistente = this.asistentes.get(id)
    if (!asistente) return false

    asistente.qrGenerado = true
    this.asistentes.set(id, asistente)
    return true
  }

  async marcarTodosQRGenerados(): Promise<void> {
    this.asistentes.forEach((asistente, id) => {
      asistente.qrGenerado = true
      this.asistentes.set(id, asistente)
    })
  }

  // Métodos para evento
  async getEvento(): Promise<Evento | null> {
    return this.evento
  }

  async updateEvento(data: Partial<Evento>): Promise<Evento> {
    this.evento = { ...this.evento!, ...data }
    return this.evento
  }

  // Métodos de utilidad
  async getEstadisticas() {
    const asistentes = Array.from(this.asistentes.values())
    return {
      totalRegistrados: asistentes.length,
      totalAsistieron: asistentes.filter(a => a.asistio).length,
      qrGenerados: asistentes.filter(a => a.qrGenerado).length,
      porcentajeAsistencia: asistentes.length > 0 
        ? (asistentes.filter(a => a.asistio).length / asistentes.length) * 100 
        : 0
    }
  }

  // Método para importar asistentes desde Google Sheets
  async importarDesdeSheets(asistentes: Omit<Asistente, 'id' | 'fechaRegistro'>[]): Promise<void> {
    // Limpiar asistentes existentes
    this.asistentes.clear()
    
    // Importar nuevos asistentes
    for (const asistenteData of asistentes) {
      await this.createAsistente(asistenteData)
    }
  }

  // Método para resetear todos los datos
  async resetDatabase(): Promise<void> {
    this.asistentes.clear()
    this.evento = null
    this.initializeDefaultData()
  }

  // Método para obtener backup de datos
  async exportData() {
    return {
      asistentes: Array.from(this.asistentes.values()),
      evento: this.evento,
      timestamp: new Date().toISOString()
    }
  }
}

// Singleton para uso global
export const db = DatabaseManager.getInstance()

// Funciones de utilidad exportadas
export async function getAllAsistentes(): Promise<Asistente[]> {
  return db.getAllAsistentes()
}

export async function getAsistenteById(id: string): Promise<Asistente | undefined> {
  return db.getAsistenteById(id)
}

export async function createAsistente(data: Omit<Asistente, 'id' | 'fechaRegistro'>): Promise<Asistente> {
  return db.createAsistente(data)
}

export async function updateAsistente(id: string, data: Partial<Asistente>): Promise<Asistente | null> {
  return db.updateAsistente(id, data)
}

export async function deleteAsistente(id: string): Promise<boolean> {
  return db.deleteAsistente(id)
}

export async function marcarAsistencia(id: string): Promise<Asistente | null> {
  return db.marcarAsistencia(id)
}

export async function getEvento(): Promise<Evento | null> {
  return db.getEvento()
}

export async function updateEvento(data: Partial<Evento>): Promise<Evento> {
  return db.updateEvento(data)
}

export async function getEstadisticas() {
  return db.getEstadisticas()
} 