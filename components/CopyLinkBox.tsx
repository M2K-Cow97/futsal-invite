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
        <input type="text" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-primary" onClick={copy}>
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>
    </div>
  );
}
