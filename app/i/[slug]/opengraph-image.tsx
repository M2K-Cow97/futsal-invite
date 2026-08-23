/*
 * 초대장 페이지(/i/[slug])의 링크 공유 썸네일.
 *
 * app/opengraph-image.tsx 는 하위 라우트로 자동 상속되지 않는다(실측 확인:
 * /i/[slug] 의 meta 에 og:image 가 비어 있었다). 정작 카톡으로 공유되는 건
 * 이 페이지라서 여기에 다시 둔다.
 *
 * 루트와 같은 고정 이미지를 쓴다 — 주최자 이름·구장은 넣지 않는다. 넣으면
 * 링크를 받은 사람이 열기 전에 보이고 카톡 서버에도 남는다.
 */
export { alt, size, contentType, default } from '../../opengraph-image';
