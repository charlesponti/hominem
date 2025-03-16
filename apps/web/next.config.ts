const { API_URL } = process.env

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['ui'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
