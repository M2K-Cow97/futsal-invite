export default function ManageLoading() {
  return (
    <main className="stage">
      <div className="card">
        <div className="skeleton" style={{ height: 30, margin: '0 auto 12px', width: '65%' }} />
        <div className="skeleton" style={{ height: 16, margin: '0 auto 24px', width: '80%' }} />
        <div className="skeleton" style={{ height: 66, marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 48, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 48 }} />
      </div>
    </main>
  );
}
