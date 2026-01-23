export default function Dashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p className="page-subtitle">Quick stats and system overview</p>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Total Wallet Connections</h3>
          <p className="card-number">Live</p>
        </div>

        <div className="card">
          <h3>Total Orders Created</h3>
          <p className="card-number">Live</p>
        </div>

        <div className="card">
          <h3>Total Transactions</h3>
          <p className="card-number">Live</p>
        </div>
      </div>

      <div className="card big-card">
        <h3>System Information</h3>

        <ul className="info-list">
          <li>Frontend: Connected</li>
          <li>Backend: Online</li>
          <li>Admin Dashboard: Active</li>
          <li>Security: URL-only access (as requested)</li>
        </ul>
      </div>
    </div>
  );
}
