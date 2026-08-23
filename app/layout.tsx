import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '나랑 풋살할래? ⚽',
  description: '풋살 초대장을 만들고 링크로 공유하세요.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /* HalfTime neutral.50 — 라이트 표면 (docs/design-system/CLAUDE.md) */
  themeColor: '#f7f8f6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* HalfTime 디자인 시스템 폰트 — Spoqa Han Sans Neo.
            weight 는 400/700 만 쓴다 (docs/design-system/CLAUDE.md §3) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@3.3.0/css/SpoqaHanSansNeo.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
