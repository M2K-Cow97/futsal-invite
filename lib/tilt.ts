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
 * 좌우 기울기를 구독한다. 세로(portrait)로 든 상태에서 폰을 좌우로 기울이면
 * `gamma` 가 변한다 (-90 ~ 90). 값을 -1~1 로 정규화해 넘긴다.
 *
 * `gamma` 는 폰을 세우면(beta ±90 근처) 짐벌락으로 값이 튀고 부호가 뒤집힌다.
 * 그래서 ±45도만 유효 입력으로 쓰고, 폰이 너무 누워/서 있으면 입력을 무시한다.
 */
export function onTilt(handler: (normalized: number, raw: number) => void): () => void {
  function listener(e: DeviceOrientationEvent) {
    const gamma = e.gamma;
    const beta = e.beta;
    if (gamma === null) return;
    // 짐벌락 구간에서는 gamma 가 신뢰할 수 없다.
    if (beta !== null && Math.abs(beta) > 75) return;
    // ±45도를 최대 입력으로 본다. 팔이 아프지 않은 범위.
    const clamped = Math.max(-45, Math.min(45, gamma));
    handler(clamped / 45, gamma);
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
