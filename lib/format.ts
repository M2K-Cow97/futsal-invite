/**
 * 경기 날짜를 사람이 읽는 형태로. `2026-11-05` → `11월 5일 (수)`
 *
 * 초대 첫 화면과 참석 확인 화면이 같은 표기를 써야 하므로 여기 둔다.
 * (원래 MatchdayScreen 안에 있었는데 두 곳에서 쓰이게 됐다)
 */
export function formatMatchDate(iso: string, opts?: { withYear?: boolean }): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return opts?.withYear
    ? `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${dow})`
    : `${m}월 ${d}일 (${dow})`;
}
