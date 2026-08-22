import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tsconfig 의 paths 만으로 webpack 이 '@/' 를 못 잡는 경우가 있어 명시적으로 준다.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, '@': root };
    return config;
  },
  turbopack: {
    resolveAlias: { '@/*': './*' },
  },
};

export default nextConfig;
