'use client';

import { useRef, useState } from 'react';
import type { Position } from '@/lib/schema';

const POSITION_LABEL: Record<Position, string> = {
  FW: '공격수 (FW)',
  MF: '미드필더 (MF)',
  DF: '수비수 (DF)',
  GK: '골키퍼 (GK)',
};

export type Ticket = {
  guestName: string;
  position: Position;
  hostName: string;
  matchDate: string;
  matchTime: string;
  venue: string;
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${dow})`;
}

/** ⑤ ticket — 확정 티켓. html2canvas 는 이 화면에 도달할 때만 로드한다 (plan 결정 3). */
export function TicketScreen({ ticket }: { ticket: Ticket }) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveImage() {
    const node = ticketRef.current;
    if (!node) return;

    setSaving(true);
    setError(null);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `futsal-${ticket.matchDate}-${ticket.guestName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      setError('이미지 저장에 실패했어요. 화면을 캡처해 주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <h2 className="title">경기 확정!</h2>
      <p className="subtitle">{ticket.hostName}이(가) 기다리고 있어</p>

      <div className="ticket" ref={ticketRef}>
        <div className="ticket-head">
          <span>FUTSAL MATCH</span>
          <span className="confirmed">CONFIRMED</span>
        </div>
        <dl className="ticket-body">
          <div className="ticket-row">
            <dt>DATE</dt>
            <dd>{formatDate(ticket.matchDate)}</dd>
          </div>
          <div className="ticket-row">
            <dt>KICK-OFF</dt>
            <dd>{ticket.matchTime}</dd>
          </div>
          <div className="ticket-row">
            <dt>STADIUM</dt>
            <dd>{ticket.venue}</dd>
          </div>
          <div className="ticket-row">
            <dt>POSITION</dt>
            <dd>{POSITION_LABEL[ticket.position]}</dd>
          </div>
          <div className="ticket-row">
            <dt>PLAYER</dt>
            <dd>{ticket.guestName}</dd>
          </div>
        </dl>

        {/*
          티켓 카드 안에 두면 저장한 PNG 에도 함께 담긴다 — 공유되는 게 목적이라
          바깥이 아니라 안쪽이 맞다. html2canvas 가 캡처하는 영역(ticketRef) 내부다.
        */}
        <img className="ticket-photo" src="/assets/messi.jpeg" alt="" aria-hidden="true" />
      </div>

      {error && <p className="warn">{error}</p>}

      <div className="ticket-actions">
        <button
          type="button"
          className="btn btn-accent"
          onClick={saveImage}
          disabled={saving}
        >
          {saving ? '저장 중…' : '이미지 저장'}
        </button>
        <a className="btn btn-ghost" href="/" style={{ textDecoration: 'none' }}>
          나도 만들기
        </a>
      </div>
    </div>
  );
}
