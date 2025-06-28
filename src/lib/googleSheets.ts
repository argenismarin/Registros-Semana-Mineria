import { google, sheets_v4 } from 'googleapis'
import { GoogleAuth } from 'google-auth-library'
import { type Asistente } from './database'

class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null
  private spreadsheetId: string
  private auth: GoogleAuth
  
  // Rate limiting y control de solicitudes - ULTRA CONSERVADOR
  private lastRequestTime: number = 0
  private requestQueue: (() => Promise<any>)[] = []
  private isProcessingQueue: boolean = false
  private readonly MIN_REQUEST_INTERVAL = 8000 // 8 segundos entre solicitudes - ULTRA CONSERVADOR
  private readonly MAX_BATCH_SIZE = 5 // Máximo 5 elementos por lote - REDUCIDO
  private pendingBatchUpdates: Map<string, Asistente> = new Map()
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY = 15000 // 15 segundos para agrupar cambios - MÁS CONSERVADOR
  private readonly MAX_RETRIES = 3
  private requestCount = 0
  private hourlyRequestStart = Date.now()

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    
    // Configurar autenticación
    this.auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }

  private async initializeSheets() {
    if (!this.sheets) {
      const authClient = await this.auth.getClient()
      this.sheets = google.sheets({ version: 'v4', auth: authClient as any })
    }
    return this.sheets
  }

  // Método auxiliar para parsear booleanos de Google Sheets
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'verdadero' || value === '1'
    }
    return false
  }

  // Obtener asistentes con rate limiting
  async getAsistentes(): Promise<Asistente[]> {
    return await this.executeWithRateLimit(async () => {
      try {
        if (!this.spreadsheetId) {
          console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
          return []
        }

        await this.ensureSheetExists()
        const sheets = await this.initializeSheets()

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Asistentes!A2:J',
        })

        const rows = response.data.values || []
        console.log(`📊 Obtenidos ${rows.length} registros de Google Sheets`)

        return rows
          .filter(row => row && row.length >= 6 && row[0] && row[1])
          .map((row): Asistente => ({
            id: row[0],
            nombre: row[1],
            email: row[2] || '',
            cargo: row[3] || '',
            empresa: row[4] || '',
            presente: this.parseBoolean(row[5]),
            escarapelaImpresa: this.parseBoolean(row[6]),
            fechaRegistro: row[7] || new Date().toISOString(),
            horaLlegada: row[8] || undefined,
            fechaImpresion: row[9] || undefined,
            qrGenerado: false,
            ultimaModificacion: row[7] || new Date().toISOString(),
            sincronizado: true,
            dispositivoOrigen: 'sheets'
          }))
      } catch (error) {
        console.error('Error obteniendo asistentes de Google Sheets:', error)
        return []
      }
    })
  }

  // Agregar asistente con rate limiting
  async addAsistente(asistente: Asistente): Promise<boolean> {
    return await this.executeWithRateLimit(async () => {
      try {
        if (!this.spreadsheetId) {
          console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
          return false
        }

        await this.ensureSheetExists()
        const sheets = await this.initializeSheets()

        const values = [[
          asistente.id,
          asistente.nombre,
          asistente.email || '',
          asistente.cargo || '',
          asistente.empresa || '',
          asistente.presente,
          asistente.escarapelaImpresa,
          asistente.fechaRegistro,
          asistente.horaLlegada || '',
          asistente.fechaImpresion || '',
        ]]

        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Asistentes!A2:J',
          valueInputOption: 'RAW',
          requestBody: {
            values,
          },
        })

        console.log(`✅ Asistente ${asistente.nombre} agregado a Google Sheets`)
        return true
      } catch (error) {
        console.error('Error agregando asistente a Google Sheets:', error)
        return false
      }
    })
  }

  // Actualizar asistente simple con rate limiting (para uso individual)
  async updateAsistente(asistente: Asistente): Promise<boolean> {
    return await this.executeWithRateLimit(async () => {
      try {
        if (!this.spreadsheetId) {
          console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
          return false
        }

        const sheets = await this.initializeSheets()
        
        const allData = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Asistentes!A2:J',
        })

        const rows = allData.data.values || []
        const rowIndex = rows.findIndex(row => row[0] === asistente.id)
        
        if (rowIndex === -1) {
          console.error('Asistente no encontrado en Google Sheets')
          return false
        }

        const updateRange = `Asistentes!A${rowIndex + 2}:J${rowIndex + 2}`
        const values = [[
          asistente.id,
          asistente.nombre,
          asistente.email || '',
          asistente.cargo || '',
          asistente.empresa || '',
          asistente.presente,
          asistente.escarapelaImpresa,
          asistente.fechaRegistro,
          asistente.horaLlegada || '',
          asistente.fechaImpresion || '',
        ]]

        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: updateRange,
          valueInputOption: 'RAW',
          requestBody: {
            values,
          },
        })

        return true
      } catch (error) {
        console.error('Error actualizando asistente en Google Sheets:', error)
        return false
      }
    })
  }

  // Buscar un asistente por ID en Google Sheets
  async findAsistenteById(id: string): Promise<Asistente | null> {
    try {
      const asistentes = await this.getAsistentes()
      return asistentes.find(a => a.id === id) || null
    } catch (error) {
      console.error('Error buscando asistente en Google Sheets:', error)
      return null
    }
  }

  // Crear la hoja si no existe
  private async ensureSheetExists(): Promise<void> {
    try {
      const sheets = await this.initializeSheets()
      
      // Obtener metadatos del spreadsheet
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      })

      const asistenteSheet = spreadsheet.data.sheets?.find(
        sheet => sheet.properties?.title === 'Asistentes'
      )

      if (!asistenteSheet) {
        // Crear la hoja Asistentes
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Asistentes',
                },
              },
            }],
          },
        })

        // Agregar headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Asistentes!A1:J1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [[
              'ID',
              'Nombre',
              'Email',
              'Cargo',
              'Empresa',
              'Presente',
              'Escarapela Impresa',
              'Fecha Registro',
              'Hora Llegada',
              'Fecha Impresión'
            ]],
          },
        })
      }
    } catch (error) {
      console.error('Error asegurando que la hoja existe:', error)
    }
  }

  // Sincronizar datos entre memoria local y Google Sheets
  async syncWithMemoryDatabase(memoryAsistentes: Asistente[]): Promise<Asistente[]> {
    try {
      console.log('🔄 Sincronizando con Google Sheets...')
      
      // Verificar configuración antes de proceder
      if (!this.isConfigured()) {
        console.log('⚠️ Google Sheets no configurado, retornando datos de memoria')
        return memoryAsistentes
      }
      
      const sheetsAsistentes = await this.getAsistentes()
      console.log(`📊 Obtenidos ${sheetsAsistentes.length} asistentes de Google Sheets`)
      
      // Si no hay datos en Sheets pero hay en memoria, intentar subir a Sheets
      if (sheetsAsistentes.length === 0 && memoryAsistentes.length > 0) {
        console.log('📝 Google Sheets vacío pero hay datos en memoria, intentando sincronizar...')
        
        // Intentar subir datos de memoria a Google Sheets
        const updatePromises = memoryAsistentes.map(asistente => this.addAsistente(asistente))
        
        try {
          await Promise.allSettled(updatePromises)
          console.log(`✅ ${memoryAsistentes.length} asistentes sincronizados a Google Sheets`)
        } catch (uploadError) {
          console.warn('⚠️ Error subiendo datos a Google Sheets:', uploadError)
        }
        
        return memoryAsistentes
      }
      
      // Si no hay datos en memoria pero hay en Sheets, usar Sheets
      if (memoryAsistentes.length === 0 && sheetsAsistentes.length > 0) {
        console.log('📝 Memoria vacía, usando datos de Google Sheets')
        return sheetsAsistentes
      }
      
      // Si no hay datos en ningún lado, retornar array vacío
      if (sheetsAsistentes.length === 0 && memoryAsistentes.length === 0) {
        console.log('📝 No hay datos en memoria ni en Google Sheets')
        return []
      }
      
      // Combinar datos - priorizar los datos más recientes
      const merged = new Map<string, Asistente>()
      
      // Agregar datos de Sheets primero
      sheetsAsistentes.forEach(asistente => {
        if (asistente && asistente.id) {
          merged.set(asistente.id, asistente)
        }
      })
      
      // Sobrescribir con datos de memoria (más recientes)
      const updatePromises: Promise<boolean>[] = []
      
      memoryAsistentes.forEach(asistente => {
        if (!asistente || !asistente.id) return // Saltar asistentes inválidos
        
        const existing = merged.get(asistente.id)
        
        // Si no existe en Sheets o los datos de memoria son más recientes
        if (!existing || 
            new Date(asistente.fechaRegistro) >= new Date(existing.fechaRegistro || 0) ||
            asistente.presente !== existing.presente ||
            asistente.escarapelaImpresa !== existing.escarapelaImpresa) {
          
          merged.set(asistente.id, asistente)
          
          // Agregar promesa de actualización solo si hay diferencias significativas
          if (existing) {
            updatePromises.push(this.updateAsistente(asistente))
          } else {
            updatePromises.push(this.addAsistente(asistente))
          }
        }
      })
      
      // Ejecutar todas las actualizaciones en paralelo
      if (updatePromises.length > 0) {
        console.log(`📊 Actualizando ${updatePromises.length} registros en Google Sheets...`)
        try {
          await Promise.allSettled(updatePromises)
        } catch (updateError) {
          console.warn('⚠️ Algunos registros no se pudieron actualizar en Google Sheets:', updateError)
        }
      }
      
      const resultado = Array.from(merged.values())
      console.log(`✅ Sincronización completada: ${resultado.length} asistentes combinados`)
      return resultado
      
    } catch (error) {
      console.error('Error sincronizando con Google Sheets:', error)
      console.log('📝 Usando datos de memoria como fallback')
      return memoryAsistentes // Fallback a datos en memoria
    }
  }

  // Método para sincronización automática en tiempo real
  async syncAsistenteToSheets(asistente: Asistente): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.log('⚠️ Google Sheets no configurado para sincronización automática')
        return false
      }

      console.log(`🔄 Sincronizando asistente ${asistente.nombre} con Google Sheets...`)
      
      // Verificar si el asistente ya existe en Sheets
      const existing = await this.findAsistenteById(asistente.id)
      
      let success = false
      if (existing) {
        success = await this.updateAsistente(asistente)
      } else {
        success = await this.addAsistente(asistente)
      }
      
      if (success) {
        console.log(`✅ Asistente ${asistente.nombre} sincronizado exitosamente`)
      } else {
        console.error(`❌ Error sincronizando asistente ${asistente.nombre}`)
      }
      
      return success
    } catch (error) {
      console.error(`❌ Error en sincronización automática de ${asistente.nombre}:`, error)
      return false
    }
  }

  // Eliminar un asistente de Google Sheets
  async deleteAsistente(asistenteId: string): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
        return false
      }

      const sheets = await this.initializeSheets()
      
      // Buscar la fila del asistente
      const allData = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistentes!A2:J',
      })

      const rows = allData.data.values || []
      const rowIndex = rows.findIndex(row => row[0] === asistenteId)
      
      if (rowIndex === -1) {
        console.log('Asistente no encontrado en Google Sheets para eliminación')
        return true // No es error, simplemente no existe
      }

      // Eliminar la fila completa (rowIndex + 2 porque empezamos en A2)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Asumiendo que es la primera hoja
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 porque incluye headers
                endIndex: rowIndex + 2
              }
            }
          }]
        }
      })

      console.log(`✅ Asistente eliminado de Google Sheets: ${asistenteId}`)
      return true
    } catch (error) {
      console.error('Error eliminando asistente de Google Sheets:', error)
      return false
    }
  }

  // Método optimizado para actualizar solo el estado de escarapela impresa
  async updateEscarapelaStatus(asistenteId: string, escarapelaImpresa: boolean, fechaImpresion?: string): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
        return false
      }

      const sheets = await this.initializeSheets()
      
      // Buscar la fila del asistente
      const allData = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistentes!A2:J',
      })

      const rows = allData.data.values || []
      const rowIndex = rows.findIndex(row => row[0] === asistenteId)
      
      if (rowIndex === -1) {
        console.error(`Asistente ${asistenteId} no encontrado en Google Sheets para actualización de escarapela`)
        return false
      }

      // Actualizar solo las columnas de escarapela impresa y fecha de impresión (columnas G y J)
      const updateRange = `Asistentes!G${rowIndex + 2}:J${rowIndex + 2}`
      const values = [[
        escarapelaImpresa, // Columna G (escarapelaImpresa)
        rows[rowIndex][7] || new Date().toISOString(), // Columna H (fechaRegistro) - mantener valor existente
        rows[rowIndex][8] || '', // Columna I (horaLlegada) - mantener valor existente
        fechaImpresion || (escarapelaImpresa ? new Date().toISOString() : '') // Columna J (fechaImpresion)
      ]]

      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      })

      console.log(`✅ Estado de escarapela actualizado en Google Sheets para ${asistenteId}: ${escarapelaImpresa}`)
      return true
    } catch (error) {
      console.error('Error actualizando estado de escarapela en Google Sheets:', error)
      return false
    }
  }

  // Método optimizado para actualizar múltiples escarapelas de una vez
  async updateMultipleEscarapelasStatus(asistentesIds: string[], escarapelaImpresa: boolean = true): Promise<{ success: number, failed: string[] }> {
    const fechaImpresion = escarapelaImpresa ? new Date().toISOString() : ''
    const failed: string[] = []
    let success = 0

    console.log(`🔄 Actualizando ${asistentesIds.length} escarapelas en Google Sheets...`)

    for (const asistenteId of asistentesIds) {
      try {
        const result = await this.updateEscarapelaStatus(asistenteId, escarapelaImpresa, fechaImpresion)
        if (result) {
          success++
        } else {
          failed.push(asistenteId)
        }
      } catch (error) {
        console.error(`Error actualizando escarapela ${asistenteId}:`, error)
        failed.push(asistenteId)
      }
    }

    console.log(`✅ Actualizadas ${success} escarapelas en Google Sheets. ${failed.length} fallidas.`)
    return { success, failed }
  }

  // Método optimizado para actualizar solo el estado de presente
  async updateAsistenciaStatus(asistenteId: string, presente: boolean, horaLlegada?: string): Promise<boolean> {
    return await this.executeWithRateLimit(async () => {
      try {
        if (!this.spreadsheetId) {
          console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
          return false
        }

        const sheets = await this.initializeSheets()
        
        const allData = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Asistentes!A2:J',
        })

        const rows = allData.data.values || []
        const rowIndex = rows.findIndex(row => row[0] === asistenteId)
        
        if (rowIndex === -1) {
          console.error('Asistente no encontrado en Google Sheets para actualización de asistencia')
          return false
        }

        const updateRange = `Asistentes!F${rowIndex + 2}:I${rowIndex + 2}`
        const values = [[
          presente,
          rows[rowIndex][6] || false,
          rows[rowIndex][7] || new Date().toISOString(),
          horaLlegada || rows[rowIndex][8] || ''
        ]]

        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: updateRange,
          valueInputOption: 'RAW',
          requestBody: {
            values,
          },
        })

        console.log(`✅ Estado de asistencia actualizado en Google Sheets para ${asistenteId}`)
        return true
      } catch (error) {
        console.error('Error actualizando estado de asistencia en Google Sheets:', error)
        return false
      }
    })
  }

  // Validar configuración
  isConfigured(): boolean {
    return !!(
      this.spreadsheetId &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    )
  }

  // Rate limiting wrapper para todas las solicitudes con manejo de 429
  private async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        let retryAttempt = 0
        
        while (retryAttempt <= this.MAX_RETRIES) {
          try {
            const now = Date.now()
            const timeSinceLastRequest = now - this.lastRequestTime
            
            // Backoff exponencial en caso de retry
            const backoffDelay = retryAttempt > 0 ? Math.min(60000, 8000 * Math.pow(2, retryAttempt)) : 0
            const totalDelay = Math.max(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest, 0) + backoffDelay
            
            if (totalDelay > 0) {
              console.log(`⏳ Rate limiting: esperando ${totalDelay}ms (intento ${retryAttempt + 1})`)
              await new Promise(resolve => setTimeout(resolve, totalDelay))
            }
            
            this.lastRequestTime = Date.now()
            this.requestCount++
            
            // Reset contador cada hora
            if (this.requestCount % 10 === 0) {
              console.log(`📊 Solicitudes en esta hora: ${this.requestCount}`)
            }
            
            const result = await operation()
            resolve(result)
            return
            
          } catch (error: any) {
            console.error(`❌ Error en operación (intento ${retryAttempt + 1}):`, error)
            
            // Manejo específico de error 429
            if (error.status === 429 || error.code === 429 || error.message?.includes('Quota exceeded')) {
              console.error(`🚨 Rate limit exceeded (intento ${retryAttempt + 1}/${this.MAX_RETRIES})`)
              
              if (retryAttempt < this.MAX_RETRIES) {
                retryAttempt++
                // Backoff exponencial más agresivo para 429
                const backoffTime = Math.min(120000, 15000 * Math.pow(2, retryAttempt))
                console.log(`⏳ 429 Retry: esperando ${backoffTime/1000}s antes del intento ${retryAttempt + 1}...`)
                await new Promise(resolve => setTimeout(resolve, backoffTime))
                continue
              }
            }
            
            // Otros errores con retry normal
            if (retryAttempt < this.MAX_RETRIES) {
              retryAttempt++
              await new Promise(resolve => setTimeout(resolve, 3000 * retryAttempt))
              continue
            }
            
            // Después de todos los intentos, rechazar
            reject(error)
            return
          }
        }
      })
      
      this.processQueue()
    })
  }

  // Procesar cola de solicitudes una por una
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }
    
    this.isProcessingQueue = true
    
    while (this.requestQueue.length > 0) {
      const operation = this.requestQueue.shift()
      if (operation) {
        try {
          await operation()
        } catch (error) {
          console.error('Error en operación de cola:', error)
        }
      }
    }
    
    this.isProcessingQueue = false
  }

  // Agregar cambio al lote para procesamiento diferido
  private addToBatch(asistente: Asistente): void {
    this.pendingBatchUpdates.set(asistente.id, asistente)
    console.log(`📦 Agregado al lote: ${asistente.nombre} (${this.pendingBatchUpdates.size} en lote)`)
    
    // Resetear timeout del lote
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }
    
    // Procesar lote si está lleno o después del delay
    if (this.pendingBatchUpdates.size >= this.MAX_BATCH_SIZE) {
      console.log('📦 Lote lleno, procesando inmediatamente')
      this.processBatch()
    } else {
      this.batchTimeout = setTimeout(() => {
        this.processBatch()
      }, this.BATCH_DELAY)
    }
  }

  // Procesar lote de cambios
  private async processBatch(): Promise<void> {
    if (this.pendingBatchUpdates.size === 0) return
    
    const asistentesToUpdate = Array.from(this.pendingBatchUpdates.values())
    const count = asistentesToUpdate.length
    
    console.log(`📦 Procesando lote de ${count} asistentes...`)
    
    // Limpiar lote
    this.pendingBatchUpdates.clear()
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
    
    try {
      await this.executeWithRateLimit(async () => {
        return await this.updateMultipleAsistentes(asistentesToUpdate)
      })
      
      console.log(`✅ Lote de ${count} asistentes procesado exitosamente`)
    } catch (error) {
      console.error(`❌ Error procesando lote de ${count} asistentes:`, error)
      
      // Reintentarlo uno por uno si el lote falla
      for (const asistente of asistentesToUpdate) {
        try {
          await this.executeWithRateLimit(async () => {
            return await this.updateAsistente(asistente)
          })
        } catch (individualError) {
          console.error(`❌ Error actualizando individualmente ${asistente.nombre}:`, individualError)
        }
      }
    }
  }

  // Nuevo método para actualizar múltiples asistentes en una sola solicitud
  private async updateMultipleAsistentes(asistentes: Asistente[]): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
        return false
      }

      const sheets = await this.initializeSheets()
      
      // Obtener todos los datos de la hoja
      const allData = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistentes!A2:J',
      })

      const rows = allData.data.values || []
      const updates: any[] = []

      // Preparar actualizaciones por lotes
      for (const asistente of asistentes) {
        const rowIndex = rows.findIndex(row => row[0] === asistente.id)
        
        if (rowIndex !== -1) {
          const range = `Asistentes!A${rowIndex + 2}:J${rowIndex + 2}`
          const values = [[
            asistente.id,
            asistente.nombre,
            asistente.email || '',
            asistente.cargo || '',
            asistente.empresa || '',
            asistente.presente,
            asistente.escarapelaImpresa,
            asistente.fechaRegistro,
            asistente.horaLlegada || '',
            asistente.fechaImpresion || '',
          ]]

          updates.push({
            range,
            values
          })
        }
      }

      if (updates.length > 0) {
        // Usar batchUpdate para múltiples rangos en una sola solicitud
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: updates
          }
        })
        
        console.log(`📊 ✅ ${updates.length} asistentes actualizados en lote`)
      }

      return true
    } catch (error) {
      console.error('Error actualizando múltiples asistentes:', error)
      return false
    }
  }

  // Método público optimizado para actualizaciones
  async updateAsistenteOptimized(asistente: Asistente, useBatch = true): Promise<boolean> {
    if (useBatch) {
      // Agregar al lote para procesamiento diferido
      this.addToBatch(asistente)
      return true // Retornar inmediatamente, se procesará en lote
    } else {
      // Procesar inmediatamente con rate limiting
      return await this.executeWithRateLimit(async () => {
        return await this.updateAsistente(asistente)
      })
    }
  }

  // Forzar procesamiento inmediato del lote pendiente
  async flushBatch(): Promise<void> {
    if (this.pendingBatchUpdates.size > 0) {
      console.log(`🚀 Forzando procesamiento de lote: ${this.pendingBatchUpdates.size} elementos`)
      await this.processBatch()
    }
  }

  // Obtener estadísticas del lote
  getBatchStats(): { pending: number, isProcessing: boolean, queueSize: number } {
    return {
      pending: this.pendingBatchUpdates.size,
      isProcessing: this.isProcessingQueue,
      queueSize: this.requestQueue.length
    }
  }

  // Obtener datos raw de Google Sheets (incluyendo registros sin ID)
  async getRawSheetData(): Promise<any[][]> {
    return await this.executeWithRateLimit(async () => {
      try {
        if (!this.spreadsheetId) {
          console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
          return []
        }

        await this.ensureSheetExists()
        const sheets = await this.initializeSheets()

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Asistentes!A2:J', // Incluir todas las filas, incluso sin ID
        })

        const rows = response.data.values || []
        console.log(`📊 Obtenidos ${rows.length} registros RAW de Google Sheets`)
        
        return rows
      } catch (error) {
        console.error('Error obteniendo datos RAW de Google Sheets:', error)
        return []
      }
    })
  }

  // Actualizar múltiples rangos en una sola operación batch
  async batchUpdateSheetData(updates: { range: string; values: any[][] }[]): Promise<boolean> {
    return await this.executeWithRateLimit(async () => {
      try {
        if (!this.spreadsheetId) {
          console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
          return false
        }

        if (updates.length === 0) {
          console.log('No hay actualizaciones para procesar')
          return true
        }

        const sheets = await this.initializeSheets()

        // Usar batchUpdate para múltiples rangos
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: updates
          }
        })

        console.log(`📊 ✅ Batch update completado: ${updates.length} rangos actualizados`)
        return true
      } catch (error) {
        console.error('Error en batch update de Google Sheets:', error)
        return false
      }
    })
  }
}

// Instancia singleton
const googleSheetsService = new GoogleSheetsService()

export default googleSheetsService 