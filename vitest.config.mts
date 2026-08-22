import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['tests/contract/**/*.test.ts'],
    // PGlite 인스턴스를 파일별로 새로 만들기 때문에 파일 간 격리가 필요하다.
    fileParallelism: false,
  },
});
