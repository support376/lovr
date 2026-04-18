/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  serverExternalPackages: ['@libsql/client'],
  // 디버그용: 프로덕션에서도 에러 메시지 노출 (MVP 디버깅 중)
  productionBrowserSourceMaps: true,
}

export default nextConfig
