import type { Metadata, Viewport } from 'next';
import './globals.css';

const title = '나랑 풋살할래? ⚽';
const description = '풋살 초대장을 만들고 링크로 공유하세요.';

export const metadata: Metadata = {
  /*
   * 링크 공유 썸네일(og:image)은 절대 URL 이어야 크롤러가 가져갈 수 있다.
   * metadataBase 가 없으면 Next 가 상대 경로로 두고 카톡·슬랙이 이미지를
   * 못 찾는다. 배포 환경에서는 NEXT_PUBLIC_BASE_URL 을 반드시 설정한다.
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  title,
  description,
  openGraph: { title, description, type: 'website', locale: 'ko_KR' },
  twitter: { card: 'summary_large_image', title, description },
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
