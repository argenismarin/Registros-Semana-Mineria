/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración básica para Vercel
  images: {
    domains: ['localhost'],
  },
  
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
  }
}

module.exports = nextConfig 