'use client';

/** 모든 미니게임이 공유하는 껍데기. 목업의 팝업 톤을 그대로 쓴다. */
export function RejectShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal reject-modal">
        <div className="reject-head">
          <span className="reject-badge">거절 심사</span>
          <h3 className="reject-title">{title}</h3>
          {subtitle && <p className="reject-sub">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="reject-footer">{footer}</div>}
      </div>
    </div>
  );
}
