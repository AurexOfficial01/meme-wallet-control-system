import { useEffect, useState } from "react";

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = "https://meme-wallet-control-system-hx1r.vercel.app";

  const loadTxs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/transactions`);
      const json = await res.json();

      if (json.success) setTxs(json.data);
      else setTxs([]);
    } catch {
      setTxs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTxs();
    const interval = setInterval(loadTxs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Transactions</h2>
        <p className="page-subtitle">All completed blockchain transactions</p>
      </div>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <div className="table">
          <div className="table-header">
            <span>TX Hash</span>
            <span>Amount ($)</span>
            <span>USDT</span>
            <span>Chain</span>
            <span>Time</span>
          </div>

          {txs.length === 0 ? (
            <div className="empty">No transactions</div>
          ) : (
            txs.map((t) => (
              <div key={t.id} className="table-row">
                <span>
                  {t.transactionHash.slice(0, 10)}...{t.transactionHash.slice(-8)}
                </span>
                <span>${t.amountUSD}</span>
                <span>{t.amountUSDT}</span>
                <span>{t.chain}</span>
                <span>{new Date(t.time).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
