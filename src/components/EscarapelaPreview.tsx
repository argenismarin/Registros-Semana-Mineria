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
    <div className="escarapela mx-auto">
      <h2>{eventoNombre}</h2>
      <div className="nombre">{asistente.nombre}</div>
      {asistente.cargo && <div className="cargo">{asistente.cargo}</div>}
      {asistente.empresa && <div className="cargo">{asistente.empresa}</div>}
    </div>
  )
} 