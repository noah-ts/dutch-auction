/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  images: {
    domains: [
      'arweave.net',
      'www.arweave.net',
      'nftstorage.link',
      'www.nftstorage.link'
    ]
  }
}

module.exports = nextConfig
