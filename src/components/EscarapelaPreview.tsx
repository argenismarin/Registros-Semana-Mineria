'use client'

interface Asistente {
  id: string
  nombre: string
  email?: string
  cargo?: string
  empresa?: string
  horaLlegada?: string
  presente: boolean
  escarapelaImpresa: boolean
}

interface EscarapelaPreviewProps {
  asistente: Asistente
  eventoNombre?: string
}

export default function EscarapelaPreview({ 
  asistente, 
  eventoNombre = "EVENTO" 
}: EscarapelaPreviewProps) {
  return (
    <div className="escarapela-sin-borde mx-auto">
      <div className="nombre-grande">{asistente.nombre}</div>
      {asistente.cargo && <div className="cargo-grande">{asistente.cargo}</div>}
    </div>
  )
} 