import { describe, expect, it } from 'vitest';
import { isScrapeAllowed } from '@/lib/venue-image';

/**
 * 사용자가 넣은 URL 을 **서버가 요청**하는 기능이라 SSRF 방어가 핵심이다.
 * 막지 않으면 클라우드 메타데이터·사내망·로컬 포트를 서버를 통해 긁을 수 있다.
 * 이 테스트가 화이트리스트를 고정한다.
 */
describe('isScrapeAllowed — SSRF 방어', () => {
  it('허용된 호스트의 https 만 통과한다', () => {
    expect(isScrapeAllowed('https://www.plabfootball.com/match/123')).toBe(true);
    expect(isScrapeAllowed('https://plabfootball.com/x')).toBe(true);
  });

  it('내부 주소를 차단한다', () => {
    // 클라우드 메타데이터 — 자격증명 탈취 경로
    expect(isScrapeAllowed('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isScrapeAllowed('http://localhost:5432/')).toBe(false);
    expect(isScrapeAllowed('http://127.0.0.1/')).toBe(false);
    expect(isScrapeAllowed('https://10.0.0.5/')).toBe(false);
    expect(isScrapeAllowed('https://192.168.1.1/')).toBe(false);
  });

  it('호스트 위장을 차단한다', () => {
    // 경로에 허용 호스트를 넣어 속이려는 시도
    expect(isScrapeAllowed('https://evil.com/plabfootball.com')).toBe(false);
    // 서브도메인 접미사 위장 — endsWith 만 보면 통과해버린다
    expect(isScrapeAllowed('https://plabfootball.com.evil.com/')).toBe(false);
  });

  it('https 가 아닌 스킴을 차단한다', () => {
    expect(isScrapeAllowed('http://www.plabfootball.com/x')).toBe(false);
    expect(isScrapeAllowed('file:///etc/passwd')).toBe(false);
    expect(isScrapeAllowed('javascript:alert(1)')).toBe(false);
  });

  it('잘못된 입력에 예외를 던지지 않는다', () => {
    expect(isScrapeAllowed('')).toBe(false);
    expect(isScrapeAllowed('not a url')).toBe(false);
  });
});
