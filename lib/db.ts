import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Database = {
  select: (...args: never[]) => unknown;
  insert: (...args: never[]) => unknown;
};

let override: unknown = null;
let cached: unknown = null;

/** 테스트에서 PGlite 기반 Drizzle 인스턴스를 주입한다. */
export function __setTestDb(instance: unknown): void {
  override = instance;
  cached = null;
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL 이 설정되지 않았습니다. .env.local 을 확인하세요 (.env.example 참고).',
    );
  }

  // Neon 은 HTTP 드라이버를 쓴다. 그 외(로컬 Postgres)는 표준 wire 프로토콜로 붙는다.
  if (url.includes('neon.tech')) {
    return drizzleNeon(neon(url), { schema });
  }

  // 로컬 개발용. 번들에 들어가지 않도록 require 로 늦게 가져온다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require('pg') as typeof import('pg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
  return drizzle(new Pool({ connectionString: url }), { schema });
}

/** 지연 생성 프록시. import 시점에 DATABASE_URL 을 요구하지 않는다. */
export const db = new Proxy({} as ReturnType<typeof drizzleNeon>, {
  get(_target, prop) {
    const target = override ?? (cached ??= createDb());
    const value = (target as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as ReturnType<typeof drizzleNeon> & Database;
