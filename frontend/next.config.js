/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
      {
        source: '/v1/:path*',
        destination: 'http://localhost:8000/v1/:path*',
      },
    ]
  },
}

module.exports = nextConfig
