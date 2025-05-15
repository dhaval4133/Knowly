import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure fallback object exists
      config.resolve.fallback = config.resolve.fallback || {};
      // Add fallbacks for Node.js core modules that shouldn't be bundled for the client
      config.resolve.fallback.child_process = false;
      config.resolve.fallback.fs = false;
      config.resolve.fallback.net = false;
      config.resolve.fallback.tls = false;
      config.resolve.fallback.dns = false; // Often related to net/tls or other server-side operations
    }
    return config;
  },
};

export default nextConfig;
