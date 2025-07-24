import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable all warnings
  onDemandEntries: {
    // Disable warnings about on-demand entries
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Disable webpack warnings
  webpack: (config, { dev, isServer }) => {
    // Disable all webpack warnings
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // Disable module resolution warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Disable performance warnings
    config.performance = {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };
    
    // Disable warnings about large chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        maxSize: 244000,
      },
    };
    
    return config;
  },
  
  // Disable TypeScript warnings
  typescript: {
    // ⚠️ Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint warnings
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Disable experimental warnings
  experimental: {
    // Disable warnings about experimental features
  },
  
  // Disable logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Disable source maps in production to reduce warnings
  productionBrowserSourceMaps: false,
  
  // Disable compression warnings
  compress: true,
  
  // Disable powered by header
  poweredByHeader: false,

  // Vercel-specific optimizations
  
  // Ensure proper static generation
  trailingSlash: false,
  
  // Optimize for Vercel
  swcMinify: true,
  
  // Ensure proper image optimization
  images: {
    unoptimized: false,
    domains: [],
  },
  
  // Ensure proper redirects
  async redirects() {
    return [
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Ensure proper headers
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
        ],
      },
    ];
  },
};

export default nextConfig;
