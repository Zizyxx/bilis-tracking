/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["leaflet", "react-leaflet"]
  }
};

export default nextConfig;
