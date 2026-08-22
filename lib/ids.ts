import { customAlphabet } from 'nanoid';

// URL 안전 문자만. 혼동하기 쉬운 문자를 굳이 빼지 않는다 — 손으로 옮겨 적는 용도가 아니다.
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

/** 공유 링크용. 64^10 ≈ 10^18 — 카톡에 붙일 만큼 짧고 열거는 무의미하다. */
export const newSlug = customAlphabet(ALPHABET, 10);

/** 관리 링크용. 64^21 ≈ 126비트 엔트로피 (constitution 원칙 V). */
export const newManageToken = customAlphabet(ALPHABET, 21);
