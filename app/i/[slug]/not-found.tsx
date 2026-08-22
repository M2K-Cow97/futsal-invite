export default function InviteNotFound() {
  return (
    <main className="stage">
      <div className="card">
        <h1 className="title">초대장을 찾을 수 없어요 🤷</h1>
        <p className="subtitle">링크가 잘못됐거나 삭제된 초대장이에요.</p>
        <a className="btn btn-primary btn-block" href="/" style={{ textDecoration: 'none' }}>
          내 초대장 만들기
        </a>
      </div>
    </main>
  );
}
