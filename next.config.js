const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: 'cloudflarestream.com' },
    ],
  },
  transpilePackages: [
    '@blocknote/core',
    '@blocknote/react',
    '@blocknote/ariakit',
    '@ariakit/react',
    '@ariakit/react-core',
  ],
};

module.exports = withNextIntl(nextConfig);