declare module 'jsqr' {
  interface QRCode {
    binaryData: number[]
    data: string
    chunks: any[]
    location: {
      topRightCorner: { x: number; y: number }
      topLeftCorner: { x: number; y: number }
      bottomRightCorner: { x: number; y: number }
      bottomLeftCorner: { x: number; y: number }
    }
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst'
    }
  ): QRCode | null

  export = jsQR
} 