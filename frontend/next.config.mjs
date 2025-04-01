/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Recommended for highlighting potential problems
  async rewrites() {
    return [
      {
        source: '/api/:path*', // Match any request starting with /api/
        // Ensure this matches your backend server URL and port
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  // Add other configurations as needed
  // For example, experimental features:
  // experimental: {
  //   serverActions: true, // If using Server Actions
  // },
  webpack: (config /*, { isServer } */) => {
    // Example: Add custom webpack configurations if needed
    // if (!isServer) {
    //   // Modify client-side webpack config
    // }
    return config;
  },
  images: {
    // Configure image optimization domains if needed
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'example.com',
    //     port: '',
    //     pathname: '/images/**',
    //   },
    // ],
  },
};

export default nextConfig;