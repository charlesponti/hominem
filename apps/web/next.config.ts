const { NEXT_PUBLIC_API_URL } = process.env

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hominem/utils', '@hominem/ai'],
  output: 'standalone', // Enable standalone output for Docker deployment
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
