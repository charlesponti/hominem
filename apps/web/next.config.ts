const { NEXT_PUBLIC_API_URL } = process.env

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hominem/utils', '@hominem/ai'],
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
