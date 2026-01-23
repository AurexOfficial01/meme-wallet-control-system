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

      if (json.success) {
        setTxs(json.data);
      } else {
        setTxs([]);
      }
    } catch (e) {
      setTxs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTxs();
    const interval = setInterval(loadTxs, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Transactions</h2>
        <p className="page-subtitle">All verified on-chain transactions from users</p>
      </div>

      {loading ? (
        <div className="loader">Loading...</div>
      ) : (
        <div className="table">
          <div className="table-header">
            <span>Tx Hash</span>
            <span>Chain</span>
            <span>USD</span>
            <span>USDT</span>
            <span>Time</span>
          </div>

          {txs.length === 0 ? (
            <div className="empty">No transactions yet</div>
          ) : (
            txs.map((tx) => (
              <div key={tx.id} className="table-row">
                <span>
                  <a
                    href={`https://explorer.io/tx/${tx.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tx-link"
                  >
                    {tx.transactionHash.slice(0, 10)}...{tx.transactionHash.slice(-10)}
                  </a>
                </span>

                <span>{tx.chain}</span>
                <span>${tx.amountUSD}</span>
                <span>{tx.amountUSDT}</span>
                <span>{new Date(tx.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
