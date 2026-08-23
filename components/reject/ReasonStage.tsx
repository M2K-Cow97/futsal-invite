'use client';

import { useRef, useState } from 'react';
import { RejectShell } from './RejectShell';
import { REASONS, type Reason } from './reasons';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

const STEP_MS = 620;
/** 사유를 이만큼 기각당하면 다음 관문으로 넘어갈 수 있다. */
const GIVE_UP_AFTER = 2;

type Phase = 'menu' | 'input' | 'reviewing' | 'verdict';

/**
 * 거절 관문: 거절 사유 선택.
 *
 * 사유를 고르면 그럴듯하게 심사하는 척한 뒤, **그 사유가 오히려 확정의 근거로**
 * 되돌아온다 (부상 → "출전 가능", 돈 없음 → "회비 면제, 이제 안 올 이유 없음").
 * 사유마다 반전이 달라서 다 눌러보게 된다.
 */
export function ReasonStage({ onGiveUp, onClose }: StageProps) {
  /** 심사 연출 타이머. 언마운트/재심사 시 정리된다. */
  const timers = useTimers();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [reason, setReason] = useState<Reason | null>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [rejected, setRejected] = useState<string[]>([]);
  /** 입력값에 따라 갈리는 판정. `dynamic` 이 없는 사유는 기본 판정을 쓴다. */
  const [ruling, setRuling] = useState<{
    verdict: string;
    resolution: string;
    stamp: string;
  } | null>(null);

  function pick(r: Reason) {
    setReason(r);
    setText('');
    setFileName(null);
    setStep(0);
    setRuling(null);
    // 파일이나 텍스트를 요구하는 사유는 입력 단계를 거친다 —
    // 사용자가 뭔가 "제출" 해야 배신이 아프다.
    setPhase(r.needsFile || r.needsText ? 'input' : 'reviewing');
    if (!r.needsFile && !r.needsText) review(r);
  }

  function review(r: Reason, submitted = '') {
    // 이전 심사가 아직 돌고 있으면 취소한다. 겹치면 새 심사가 중간에
    // verdict 로 건너뛰고 기각 목록이 어긋난다.
    timers.clear();
    setPhase('reviewing');
    setStep(0);
    // 심사 시작 시점의 입력값으로 판정을 미리 계산해 둔다.
    setRuling(r.dynamic?.(submitted) ?? null);
    r.steps.forEach((_, i) => {
      timers.set(() => setStep(i + 1), (i + 1) * STEP_MS);
    });
    timers.set(
      () => {
        setRejected((prev) => (prev.includes(r.id) ? prev : [...prev, r.id]));
        setPhase('verdict');
      },
      r.steps.length * STEP_MS + 480,
    );
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !reason) return;
    // 파일은 서버로 보내지 않는다. 이름·크기만 쓰고 참조를 버린다.
    setFileName(`${file.name} (${Math.max(1, Math.round(file.size / 1024))}KB)`);
    review(reason, file.name);
  }

  const remaining = REASONS.filter((r) => !rejected.includes(r.id));
  const canSubmitText = reason?.needsText ? text.trim().length > 0 : true;

  return (
    <RejectShell
      title="거절 사유 심사"
      subtitle={
        phase === 'menu'
          ? '거절하려면 사유를 선택하세요. 정당한 사유는 승인됩니다.'
          : (reason?.confirm ?? '')
      }
    >
      {phase === 'menu' && (
        <>
          <div className="reason-list">
            {REASONS.map((r) => {
              const done = rejected.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`reason-item${done ? ' rejected' : ''}`}
                  disabled={done}
                  onClick={() => pick(r)}
                >
                  <span className="reason-emoji">{r.emoji}</span>
                  <span className="reason-label">{r.label}</span>
                  <span className="reason-mark">{done ? '기각' : '›'}</span>
                </button>
              );
            })}
          </div>
          <p className="lever-hint">
            {rejected.length === 0
              ? '💡 사유가 정당하면 바로 승인됩니다'
              : remaining.length === 0
                ? '모든 사유가 기각되었습니다'
                : `${rejected.length}개 기각 · ${remaining.length}개 남음`}
          </p>
        </>
      )}

      {phase === 'input' && reason && (
        <>
          {reason.needsFile && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                hidden
                onChange={onPickFile}
                aria-label={reason.needsFile.cta}
              />
              <button
                type="button"
                className="injury-drop"
                onClick={() => fileRef.current?.click()}
              >
                <span className="injury-drop-icon">{reason.emoji}</span>
                <span className="injury-drop-main">{reason.needsFile.cta}</span>
                <span className="injury-drop-sub">{reason.needsFile.sub}</span>
              </button>
              <p className="lever-hint">📎 제출한 파일은 서버로 전송되지 않습니다</p>
            </>
          )}

          {reason.needsText && (
            <>
              <div className="field" style={{ marginTop: 4 }}>
                <label className="label" htmlFor="reasonText">
                  {reason.needsText.label}
                </label>
                <input
                  id="reasonText"
                  className="input"
                  type="text"
                  maxLength={reason.needsText.maxLength}
                  placeholder={reason.needsText.placeholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-accent btn-block"
                disabled={!canSubmitText}
                onClick={() => review(reason, text)}
              >
                제출
              </button>
            </>
          )}
        </>
      )}

      {phase === 'reviewing' && reason && (
        <div className="injury-review">
          {fileName && <p className="injury-file">📄 {fileName}</p>}
          {reason.needsText && text && <p className="injury-file">✍️ {text}</p>}
          <ul className="injury-steps">
            {reason.steps.map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''}>
                <span className="injury-step-mark">
                  {i < step ? '✓' : i === step ? '…' : '·'}
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === 'verdict' && reason && (
        <div className="injury-verdict">
          {fileName && <p className="injury-file">📄 {fileName}</p>}
          {reason.needsText && text && <p className="injury-file">✍️ {text}</p>}
          <p className="injury-verdict-head">{ruling?.verdict ?? reason.verdict}</p>
          <p className="injury-verdict-body">{ruling?.resolution ?? reason.resolution}</p>
          <p className="injury-stamp">{ruling?.stamp ?? reason.stamp}</p>
        </div>
      )}

      <div className="modal-actions">
        {phase === 'verdict' && remaining.length > 0 && (
          <button type="button" className="btn btn-accent" onClick={() => setPhase('menu')}>
            다른 사유로
          </button>
        )}
        {phase === 'input' && (
          <button type="button" className="btn btn-ghost" onClick={() => setPhase('menu')}>
            뒤로
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          그냥 할래
        </button>
      </div>

      {rejected.length >= GIVE_UP_AFTER && phase !== 'reviewing' && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onGiveUp}
        >
          다른 방법으로 거절
        </button>
      )}
    </RejectShell>
  );
}
