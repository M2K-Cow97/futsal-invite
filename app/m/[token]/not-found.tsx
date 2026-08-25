export default function ManageNotFound() {
  return (
    <main className="stage">
      <div className="card">
        <h1 className="title">잘못된 관리 링크예요</h1>
        <p className="subtitle">링크를 다시 확인해 주세요.</p>
        <a className="btn btn-primary btn-block" href="/" style={{ textDecoration: 'none' }}>
          새 초대장 만들기
        </a>
      </div>
    </main>
  );
}
