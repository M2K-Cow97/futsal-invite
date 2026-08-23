import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { __setTestDb } from '@/lib/db';
import * as schema from '@/lib/schema';

/**
 * 실제 Postgres(PGlite, wasm 인프로세스)로 계약 테스트를 돌린다.
 * 외부 DB 없이도 UNIQUE 제약과 ON CONFLICT 동작이 진짜로 검증된다.
 */
export async function createTestDb() {
  const client = new PGlite();

  // data-model.md 의 DDL 을 그대로 적용한다.
  await client.exec(`
    CREATE TYPE "position" AS ENUM ('FW', 'MF', 'DF', 'GK');

    CREATE TABLE "invites" (
      "id"           serial PRIMARY KEY,
      "slug"         text NOT NULL UNIQUE,
      "manage_token" text NOT NULL UNIQUE,
      "host_name"    varchar(20) NOT NULL,
      "match_date"   date NOT NULL,
      "match_time"   time NOT NULL,
      "venue"        varchar(50) NOT NULL,
      "match_url"    varchar(500),
      "created_at"   timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE "responses" (
      "id"         serial PRIMARY KEY,
      "invite_id"  integer NOT NULL REFERENCES "invites"("id") ON DELETE CASCADE,
      "guest_name" varchar(20) NOT NULL,
      "position"   "position" NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "responses_invite_guest_unique" UNIQUE ("invite_id", "guest_name")
    );
  `);

  const db = drizzle(client, { schema });
  __setTestDb(db);
  return { client, db };
}

/** 미래 날짜를 YYYY-MM-DD 로. 과거 날짜 검증에 걸리지 않게 한다. */
export function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function pastDate(daysAgo = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function postJson(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
