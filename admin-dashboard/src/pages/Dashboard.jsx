import { useEffect, useState } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    wallets: 0,
    orders: 0,
    transactions: 0,
  });

  const API = "https://meme-wallet-control-system-hx1r.vercel.app";

  const loadStats = async () => {
    try {
      const w = await fetch(`${API}/api/admin/wallets`).then(r => r.json());
      const o = await fetch(`${API}/api/admin/orders`).then(r => r.json());
      const t = await fetch(`${API}/api/admin/transactions`).then(r => r.json());

      setStats({
        wallets: w?.data?.length || 0,
        orders: o?.data?.length || 0,
        transactions: t?.data?.length || 0,
      });
    } catch {}
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p className="page-subtitle">Overview of all activity</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.wallets}</h3>
          <p>Connected Wallets</p>
        </div>
        <div className="stat-card">
          <h3>{stats.orders}</h3>
          <p>Total Orders</p>
        </div>
        <div className="stat-card">
          <h3>{stats.transactions}</h3>
          <p>Completed Transactions</p>
        </div>
      </div>
    </div>
  );
}
