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

  // Neon 은 HTTP 드라이버를 쓴다. 그 외(Supabase·로컬 Postgres)는 표준 wire 프로토콜.
  if (url.includes('neon.tech')) {
    return drizzleNeon(neon(url), { schema });
  }

  // 번들에 들어가지 않도록 require 로 늦게 가져온다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require('pg') as typeof import('pg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');

  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

  /*
   * 서버리스(Vercel)에서는 함수 인스턴스마다 풀이 생긴다. 풀을 크게 잡으면
   * 커넥션 한도를 금방 쓰므로 인스턴스당 1개로 제한하고, 유휴 커넥션은 빨리 닫는다.
   * Supabase 는 Transaction pooler(:6543) 로 붙는 것을 전제로 한다.
   */
  return drizzle(
    new Pool({
      connectionString: url,
      /*
       * 관리형 Postgres 는 SSL 필수.
       *
       * Supabase pooler 는 **자체 CA** 를 쓴다(실측: `*.pooler.supabase.com`
       * ← `Supabase Intermediate 2021 CA` ← `Supabase Root 2021 CA`). 공개 CA 가
       * 아니므로 rejectUnauthorized:true 로 두면 연결 자체가 실패한다
       * ("self-signed certificate in certificate chain").
       *
       * 제대로 하려면 Supabase 대시보드에서 CA 인증서를 받아
       * SUPABASE_CA_CERT 로 넘겨야 한다 — 그러면 암호화와 MITM 방어를 모두 얻는다.
       * 서버가 협상 중 보내주는 체인을 신뢰 기준으로 쓰면 안 된다(MITM 이 보낸
       * 인증서도 똑같이 받아들이게 되므로 검증이 무의미해진다).
       *
       * CA 가 주어지면 검증하고, 없으면 암호화만 유지한다. 후자는 수동적 도청은
       * 막지만 능동적 MITM 은 막지 못한다 — 경로가 AWS 내부 백본이라 실행
       * 난이도가 높아 감수하되, CA 를 확보하면 바로 검증으로 올라간다.
       */
      ssl: isLocal
        ? undefined
        : process.env.SUPABASE_CA_CERT
          ? { ca: process.env.SUPABASE_CA_CERT, rejectUnauthorized: true }
          : { rejectUnauthorized: false },
      max: isLocal ? 10 : 1,
      idleTimeoutMillis: isLocal ? 30_000 : 10_000,
      connectionTimeoutMillis: 10_000,
    }),
    { schema },
  );
}

/** 지연 생성 프록시. import 시점에 DATABASE_URL 을 요구하지 않는다. */
export const db = new Proxy({} as ReturnType<typeof drizzleNeon>, {
  get(_target, prop) {
    const target = override ?? (cached ??= createDb());
    const value = (target as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as ReturnType<typeof drizzleNeon> & Database;
