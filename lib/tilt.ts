'use client';

/**
 * 기기 기울기 센서.
 *
 * 제약이 많아 폴백이 필수다:
 * - **HTTPS 필수**. http:// 에서는 API 자체가 없다 (secure context)
 * - iOS 는 `DeviceOrientationEvent.requestPermission()` 을 사용자 제스처 안에서 호출해야 한다
 * - 카카오톡 인앱 브라우저 등 일부 웹뷰는 아예 지원하지 않는다
 *
 * 그래서 센서를 못 쓰는 환경에서는 터치 드래그로 대체한다 (spec Edge Cases).
 */

export type TiltSupport =
  | 'unsupported'
  | 'insecure'
  | 'inapp-browser'
  | 'needs-permission'
  | 'ready'
  | 'denied';

/**
 * 카카오톡 인앱 브라우저 감지.
 *
 * iOS 카카오톡은 WKWebView 인데, 호스트 앱이 모션 권한 델리게이트를 구현하지
 * 않으면 프롬프트도 없이 즉시 'denied' 가 된다. iOS 는 권한 요청 기회가 **단 한 번**이고
 * 거부되면 프로그램으로 되돌릴 수 없으므로, 시도하기 전에 걸러내야 한다.
 * (링크를 카톡으로 공유하는 앱이라 이 경로가 실제 기본 경로다)
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
}

/** 센서를 쓸 수 있는지 확인한다. 실제 권한 요청은 하지 않는다. */
export function detectTilt(): TiltSupport {
  if (typeof window === 'undefined') return 'unsupported';
  // HTTPS 아니면 API 자체가 없다. Android Chrome 은 M76 부터 http 에서 제거됐다.
  if (!window.isSecureContext) return 'insecure';
  if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
  // 인앱 브라우저는 권한 요청을 낭비하지 않고 바로 폴백으로 보낸다.
  if (isInAppBrowser()) return 'inapp-browser';

  const requestPermission = (
    DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
  ).requestPermission;

  return typeof requestPermission === 'function' ? 'needs-permission' : 'ready';
}

/**
 * iOS 권한 요청. **반드시 탭 핸들러 안에서 호출해야 한다.**
 * 한 번 거부되면 다시 물어볼 수 없으므로 거부 시 터치 폴백으로 넘긴다.
 */
export async function requestTilt(): Promise<TiltSupport> {
  const requestPermission = (
    DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
  ).requestPermission;

  if (typeof requestPermission !== 'function') return 'ready';

  try {
    const state = await requestPermission();
    return state === 'granted' ? 'ready' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * 2축 기울기를 구독한다. 좌우는 `gamma`, 전후는 `beta` 를 쓴다.
 * 둘 다 -1~1 로 정규화해 넘긴다 (x: 오른쪽이 +, y: 앞으로 기울이면 +).
 *
 * `beta` 는 폰을 완전히 세우면 짐벌락에 걸리므로, 편안한 자세인 20~70도를
 * 중립 ±로 매핑한다. 화면을 보려면 어차피 폰을 조금 눕히기 때문이다.
 */
export function onTilt2D(
  handler: (x: number, y: number) => void,
): () => void {
  /** beta 중립값(도). 이 각도를 y=0 으로 본다. */
  const BETA_NEUTRAL = 45;
  /** 중립에서 이만큼 기울이면 최대 입력. */
  const BETA_RANGE = 25;
  const GAMMA_RANGE = 35;

  function listener(e: DeviceOrientationEvent) {
    const { gamma, beta } = e;
    if (gamma === null || beta === null) return;
    // 짐벌락 구간에서는 gamma 부호가 뒤집힌다.
    if (Math.abs(beta) > 80) return;

    const x = Math.max(-1, Math.min(1, gamma / GAMMA_RANGE));
    const y = Math.max(-1, Math.min(1, (beta - BETA_NEUTRAL) / BETA_RANGE));
    handler(x, y);
  }

  window.addEventListener('deviceorientation', listener);
  return () => window.removeEventListener('deviceorientation', listener);
}

/**
 * 진동. **iOS 사파리는 Vibration API 를 지원하지 않는다** (iOS 26 기준).
 * 안드로이드 크롬에서만 동작하므로 햅틱에 의존하는 연출은 만들지 않는다.
 */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 미지원. 무시한다. */
  }
}
