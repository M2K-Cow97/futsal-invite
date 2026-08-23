'use client';

import { useState } from 'react';

export function CopyLinkBox({
  label,
  desc,
  url,
}: {
  label: string;
  desc: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API 가 막힌 환경(비 HTTPS 등). 입력창을 선택해 수동 복사하게 둔다.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="link-box">
      <span className="link-label">{label}</span>
      <p className="link-desc">{desc}</p>
      <div className="link-row">
        {/*
         * <input> 은 한 줄이라 긴 URL 의 slug 가 잘려 안 보였다. 링크는 눈으로
         * 확인해야 하는 값이므로 줄바꿈되는 요소로 보여준다.
         * readOnly input 을 쓰면 iOS 사파리가 포커스 시 화면을 확대하는 문제도 없다.
         */}
        <p className="link-url">{url}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={copy}>
          {copied ? '복사됨 ✓' : '링크 복사'}
        </button>
      </div>
    </div>
  );
}
