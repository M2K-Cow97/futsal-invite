'use client';

/**
 * 마이크 음량 측정.
 *
 * 제약이 기울기 센서와 비슷하다:
 * - **HTTPS 필수** (secure context). http:// 에서는 `getUserMedia` 자체가 없다
 * - 사용자 제스처 안에서 권한을 요청해야 한다
 * - 카카오톡 등 인앱 브라우저는 막힐 수 있다
 * - 거부되면 다시 물어볼 수 없다
 *
 * 그래서 못 쓰는 환경에서는 연타 폴백으로 대체한다.
 * 오디오는 **측정만** 하고 어디에도 보내거나 저장하지 않는다.
 */

export type MicSupport = 'unsupported' | 'insecure' | 'inapp-browser' | 'ready' | 'denied';

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
}

/** 쓸 수 있는지 확인한다. 실제 권한 요청은 하지 않는다. */
export function detectMic(): MicSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return 'unsupported';
  if (isInAppBrowser()) return 'inapp-browser';
  return 'ready';
}

export type MicMeter = {
  /** 0~1 로 정규화된 현재 음량. */
  level: () => number;
  stop: () => void;
};

/**
 * 마이크를 열고 음량 측정을 시작한다. **사용자 제스처 안에서 호출해야 한다.**
 * 실패하면 null 을 돌려주므로 호출부가 폴백으로 넘어가면 된다.
 */
export async function startMic(): Promise<MicMeter | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buf = new Float32Array(analyser.fftSize);

    return {
      level() {
        analyser.getFloatTimeDomainData(buf);
        // RMS → 0~1. 말소리(약 0.02)보다 고함(0.3+)이 훨씬 크다.
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        return Math.min(1, rms * 4.2);
      },
      stop() {
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}
