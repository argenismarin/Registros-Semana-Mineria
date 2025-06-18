/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para Vercel - eliminar output standalone que causa problemas
  // output: 'standalone', // Comentado para Vercel
  
  // Configuración de headers para Socket.io
  async headers() {
    return [
      {
        source: '/api/socket.io/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  },

  // Configuración para archivos estáticos
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket.io/:path*'
      }
    ]
  },

  // Optimizaciones de imagen
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },

  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  },

  // Configuración experimental más conservadora para Vercel
  experimental: {
    // Remover optimizeCss que puede causar problemas con critters
    // optimizeCss: true, // Comentado para evitar errores con critters
    // Mejor manejo de Server Components
    serverComponentsExternalPackages: ['googleapis']
  }
}

module.exports = nextConfig 