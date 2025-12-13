/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  output: 'export',
  distDir: 'dist',
  turbopack: {
    // Force Turbopack to treat this folder as the workspace root.
    // Prevents it from walking up to a parent directory lockfile (e.g. ../yarn.lock)
    // which can trigger "pages and app directories should be under the same folder".
    root: __dirname,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      child_process: false,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

export default nextConfig;
