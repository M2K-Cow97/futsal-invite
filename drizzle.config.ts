import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    /*
     * 마이그레이션은 direct connection 으로 붙는다.
     * Supabase 의 Transaction pooler(:6543)는 prepared statement 를 지원하지 않아
     * 스키마 변경에 쓸 수 없다. DIRECT_URL 이 있으면 그걸 쓰고, 없으면
     * DATABASE_URL(로컬 개발 등)로 떨어진다.
     */
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
