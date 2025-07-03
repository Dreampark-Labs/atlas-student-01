/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Webpack configuration to handle Clerk and other vendor chunks
  webpack: (config, { isServer }) => {
    // Handle Clerk modules properly
    config.externals = config.externals || [];
    
    // Fix for Clerk vendor chunks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Transpile Clerk packages
  transpilePackages: ['@clerk/nextjs', '@clerk/clerk-react', '@clerk/clerk-sdk-node'],
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      // Font loading optimization
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for production deployment
  async redirects() {
    return [
      // Redirect old routes to maintain compatibility
      {
        source: '/',
        destination: '/',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: '__session',
          },
        ],
      },
    ];
  },
}

export default nextConfig
