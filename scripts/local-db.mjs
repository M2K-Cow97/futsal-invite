/**
 * 로컬 개발용 Postgres. Neon 계정 없이도 앱을 돌려볼 수 있게
 * PGlite(인프로세스 Postgres)를 wire 프로토콜로 노출한다.
 *
 *   node scripts/local-db.mjs      # :55432 에서 대기
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres" npm run dev
 *
 * 데이터는 메모리에만 있어 종료 시 사라진다. 실제 배포에는 Neon 을 쓴다.
 */
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'pglite-server';

const PORT = Number(process.env.LOCAL_DB_PORT ?? 55432);
const db = await PGlite.create();

await db.exec(`
  CREATE TYPE "position" AS ENUM ('FW','MF','DF','GK');
  CREATE TABLE "invites" (
    "id" serial PRIMARY KEY,
    "slug" text NOT NULL UNIQUE,
    "manage_token" text NOT NULL UNIQUE,
    "host_name" varchar(20) NOT NULL,
    "match_date" date NOT NULL,
    "match_time" time NOT NULL,
    "venue" varchar(50) NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE "responses" (
    "id" serial PRIMARY KEY,
    "invite_id" integer NOT NULL REFERENCES "invites"("id") ON DELETE CASCADE,
    "guest_name" varchar(20) NOT NULL,
    "position" "position" NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "responses_invite_guest_unique" UNIQUE ("invite_id","guest_name")
  );
`);

createServer(db, { port: PORT }).listen(PORT, () => {
  console.log(`로컬 Postgres 준비 완료 → postgresql://postgres:postgres@localhost:${PORT}/postgres`);
});
