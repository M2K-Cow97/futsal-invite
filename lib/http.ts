import { NextResponse } from 'next/server';

export function badRequest(error = 'invalid_input') {
  return NextResponse.json({ error }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}

/** 원인은 서버 로그에만 남긴다. 응답에 스택트레이스를 담지 않는다 (contracts/api.md). */
export function internalError(cause: unknown) {
  console.error('[api] internal_error', cause);
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}

/** 배포 도메인이 확정되기 전에도 링크가 깨지지 않도록 요청 origin 을 폴백으로 쓴다. */
export function baseUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
}
