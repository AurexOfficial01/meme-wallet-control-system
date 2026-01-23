export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">Control Panel</h1>
      </div>

      <div className="topbar-right">
        <div className="admin-badge">
          <span className="admin-dot"></span>
          <span className="admin-text">Admin</span>
        </div>
      </div>
    </header>
  );
}
