/**
 * 경기 예약 페이지(플랩 등)에서 대표 이미지(og:image)를 뽑아온다.
 *
 * ── 왜 화이트리스트인가
 * 사용자가 넣은 URL 을 **서버가 요청**하는 구조는 SSRF 다. 막지 않으면
 * `http://169.254.169.254/`(클라우드 메타데이터), `http://localhost:5432`,
 * 사내망 주소 같은 것을 넣어 서버를 프록시처럼 쓸 수 있다. 응답 내용이 그대로
 * 노출되지는 않지만, 내부 포트 스캔이나 메타데이터 탈취 경로가 된다.
 *
 * IP 대역을 걸러내는 방식(DNS 조회 후 사설 IP 차단)은 DNS rebinding 으로
 * 우회되므로, **허용 호스트를 명시**하는 쪽이 확실하다. 지원 서비스가 늘면
 * ALLOWED_HOSTS 에 추가한다.
 */

/** 스크래핑을 허용하는 호스트. 서브도메인은 endsWith 로 함께 허용한다. */
const ALLOWED_HOSTS = ['plabfootball.com', 'plab-football.com'];

/** 응답을 기다리는 한도. 남의 서버가 느려도 우리 요청이 매달려 있지 않게. */
const TIMEOUT_MS = 4000;
/** HTML 을 이만큼만 읽는다. og:image 는 <head> 에 있어 앞부분이면 충분하다. */
const MAX_BYTES = 256 * 1024;

export function isScrapeAllowed(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** <head> 에서 og:image / twitter:image 를 찾는다. */
function extractImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    try {
      // 상대 경로일 수 있으므로 페이지 URL 기준으로 절대화한다.
      const abs = new URL(m[1], pageUrl);
      // 이미지도 https 만 받는다 — http 이미지는 브라우저가 차단한다.
      if (abs.protocol !== 'https:') continue;
      return abs.toString();
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 대표 이미지 URL 을 반환한다. 실패하면 null — 호출자는 기본 이미지로 폴백한다.
 * 남의 서비스에 의존하는 기능이라 실패를 정상 경로로 취급한다(throw 하지 않는다).
 */
export async function fetchVenueImage(rawUrl: string): Promise<string | null> {
  if (!isScrapeAllowed(rawUrl)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // 봇 차단을 피하되 정체를 숨기지는 않는다.
        'User-Agent': 'futsal-invite/1.0 (link preview)',
        Accept: 'text/html',
      },
    });

    if (!res.ok) return null;
    if (!res.headers.get('content-type')?.includes('text/html')) return null;

    // 전체를 받지 않고 앞부분만 읽는다.
    const reader = res.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    void reader.cancel();

    const merged = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      merged.set(c, at);
      at += c.length;
    }

    return extractImage(new TextDecoder().decode(merged), rawUrl);
  } catch {
    // 타임아웃·네트워크 오류·파싱 실패 — 모두 폴백으로 간다.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
