import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * 포지션. FW 는 도메인 완전성을 위해 존재하지만 클라이언트는 전송하지 않는다.
 * 공격수는 2단 팝업으로 차단되어 확정 경로가 없다 (spec SC-005).
 */
export const positionEnum = pgEnum('position', ['FW', 'MF', 'DF', 'GK']);

export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  /** 공유 링크 /i/{slug} — nanoid 10자 */
  slug: text('slug').notNull().unique(),
  /** 관리 링크 /m/{token} — nanoid 21자. 공개 응답에 절대 포함하지 않는다 */
  manageToken: text('manage_token').notNull().unique(),
  hostName: varchar('host_name', { length: 20 }).notNull(),
  matchDate: date('match_date').notNull(),
  matchTime: time('match_time').notNull(),
  venue: varchar('venue', { length: 50 }).notNull(),
  /**
   * 플랩·매치 등 경기 예약 페이지 링크. 선택 항목이다.
   * 게스트가 구장 위치·회비 같은 상세를 직접 확인할 수 있게 한다.
   */
  matchUrl: varchar('match_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const responses = pgTable(
  'responses',
  {
    id: serial('id').primaryKey(),
    inviteId: integer('invite_id')
      .notNull()
      .references(() => invites.id, { onDelete: 'cascade' }),
    guestName: varchar('guest_name', { length: 20 }).notNull(),
    position: positionEnum('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // 같은 초대장에 같은 이름은 하나뿐. upsert 의 충돌 대상이다 (spec FR-004).
    unique('responses_invite_guest_unique').on(table.inviteId, table.guestName),
  ],
);

export type Invite = typeof invites.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type Position = (typeof positionEnum.enumValues)[number];
