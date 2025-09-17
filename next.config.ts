import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'lh4.googleusercontent.com', 'lh5.googleusercontent.com', 'lh6.googleusercontent.com'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  webpack: (config, { isServer }) => {
    // Handle WASM files for argon2-browser
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Configure WASM module rule
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Resolve fallbacks for Node.js modules in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        util: require.resolve('util/'),
      };
    }

    return config;
  },
};

export default nextConfig;
