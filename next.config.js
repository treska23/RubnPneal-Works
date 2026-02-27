/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],
  },
  webpack(config) {
    config.resolve.alias['phaser'] = require('path').resolve(
      __dirname,
      'node_modules/phaser/dist/phaser.js',
    );
    return config;
  },
};
module.exports = nextConfig;
