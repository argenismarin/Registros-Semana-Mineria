import { google, sheets_v4 } from 'googleapis'
import { GoogleAuth } from 'google-auth-library'
import { type Asistente } from './database'

class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null
  private spreadsheetId: string
  private auth: GoogleAuth

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

  // Leer todos los asistentes desde Google Sheets
  async getAsistentes(): Promise<Asistente[]> {
    try {
      if (!this.spreadsheetId) {
        console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
        return []
      }

      const sheets = await this.initializeSheets()
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Asistentes!A2:J', // Desde fila 2 para omitir headers
      })

      const rows = response.data.values || []
      
      return rows.map((row, index): Asistente => ({
        id: row[0] || `generated-${index}`,
        nombre: row[1] || '',
        email: row[2] || '',
        cargo: row[3] || '',
        empresa: row[4] || '',
        presente: row[5] === 'TRUE' || row[5] === 'true',
        escarapelaImpresa: row[6] === 'TRUE' || row[6] === 'true',
        fechaRegistro: row[7] || new Date().toISOString(),
        horaLlegada: row[8] || undefined,
        fechaImpresion: row[9] || undefined,
      }))
    } catch (error) {
      console.error('Error leyendo Google Sheets:', error)
      return []
    }
  }

  // Agregar un nuevo asistente a Google Sheets
  async addAsistente(asistente: Asistente): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('GOOGLE_SHEETS_SPREADSHEET_ID no configurado')
        return false
      }

      const sheets = await this.initializeSheets()
      
      // Primero verificar si existe la hoja, si no, crearla
      await this.ensureSheetExists()
      
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

      return true
    } catch (error) {
      console.error('Error agregando asistente a Google Sheets:', error)
      return false
    }
  }

  // Actualizar un asistente en Google Sheets
  async updateAsistente(asistente: Asistente): Promise<boolean> {
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
      const rowIndex = rows.findIndex(row => row[0] === asistente.id)
      
      if (rowIndex === -1) {
        console.error('Asistente no encontrado en Google Sheets')
        return false
      }

      // Actualizar la fila (rowIndex + 2 porque empezamos en A2)
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
      const sheetsAsistentes = await this.getAsistentes()
      
      // Combinar datos - priorizar los datos más recientes
      const merged = new Map<string, Asistente>()
      
      // Agregar datos de Sheets primero
      sheetsAsistentes.forEach(asistente => {
        merged.set(asistente.id, asistente)
      })
      
      // Sobrescribir con datos de memoria (más recientes)
      memoryAsistentes.forEach(asistente => {
        const existing = merged.get(asistente.id)
        if (!existing || new Date(asistente.fechaRegistro) >= new Date(existing.fechaRegistro)) {
          merged.set(asistente.id, asistente)
          // Actualizar en Sheets
          this.updateAsistente(asistente).catch(console.error)
        }
      })
      
      return Array.from(merged.values())
    } catch (error) {
      console.error('Error sincronizando con Google Sheets:', error)
      return memoryAsistentes // Fallback a datos en memoria
    }
  }

  // Validar configuración
  isConfigured(): boolean {
    return !!(
      this.spreadsheetId &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    )
  }
}

// Instancia singleton
const googleSheetsService = new GoogleSheetsService()

export default googleSheetsService 