/** Neon cold start(첫 요청 ~1초)를 흡수한다 (research 결정 2). */
export default function InviteLoading() {
  return (
    <main className="stage">
      <div className="card">
        <div className="skeleton" style={{ height: 30, margin: '0 auto 12px', width: '75%' }} />
        <div className="skeleton" style={{ height: 16, margin: '0 auto 28px', width: '50%' }} />
        <div className="skeleton" style={{ height: 50, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 46, width: '55%', margin: '0 auto' }} />
      </div>
    </main>
  );
}
