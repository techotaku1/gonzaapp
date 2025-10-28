import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';

const jiti = createJiti(fileURLToPath(import.meta.url));

// Validar variables de entorno
jiti('./src/env.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  cacheComponents: true, // <-- Habilita Cache Components (use cache)
  turbopack: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [32, 48, 64, 96, 128, 256, 384], // 16 removido por default en Next.js 16
    minimumCacheTTL: 14400, // 4 horas por default en Next.js 16
    remotePatterns: [
      new URL('https://s3.us-east-2.amazonaws.com/artiefy-upload/**'),
      new URL('https://placehold.co/**'),
      new URL('https://img.clerk.com/**'),
      new URL('https://assets.example.com/**'),
    ],
    // Si usas imágenes locales con query strings, agrega localPatterns.search aquí
    // localPatterns: [
    //   { pathname: '/assets/**', search: '?v=1' },
    // ],
    // qualities: [75], // Default Next.js 16
    // maximumRedirects: 3, // Default Next.js 16
    // dangerouslyAllowLocalIP: false, // Default Next.js 16
  },
  expireTime: 3600,
  // Elimina cualquier experimental.outputFileTracingIncludes, experimental.dynamicIO, experimental.ppr, eslint, etc.
};

export default nextConfig;
