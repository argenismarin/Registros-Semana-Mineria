/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones para Vercel
  output: 'standalone',
  
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

  // Configuración experimental para mejor rendimiento
  experimental: {
    // Optimización del bundle
    optimizeCss: true,
    // Mejor manejo de Server Components
    serverComponentsExternalPackages: ['googleapis']
  }
}

module.exports = nextConfig 