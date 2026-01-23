import { useEffect, useState } from "react";

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = "https://meme-wallet-control-system-hx1r.vercel.app";

  const loadWallets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/wallets`);
      const json = await res.json();

      if (json.success) {
        setWallets(json.data);
      } else {
        setWallets([]);
      }
    } catch (e) {
      setWallets([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWallets();
    const interval = setInterval(loadWallets, 5000); // auto refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Connected Wallets</h2>
        <p className="page-subtitle">All wallets that connected through the frontend</p>
      </div>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <div className="table">
          <div className="table-header">
            <span>Wallet Address</span>
            <span>Chain</span>
            <span>Wallet Name</span>
            <span>Time</span>
          </div>

          {wallets.length === 0 ? (
            <div className="empty">No wallets connected yet</div>
          ) : (
            wallets.map((w) => (
              <div key={w.id} className="table-row">
                <span className="address">
                  {w.address.slice(0, 8)}...{w.address.slice(-6)}
                </span>
                <span>{w.chain}</span>
                <span>{w.walletName || "Unknown"}</span>
                <span>{new Date(w.time).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
