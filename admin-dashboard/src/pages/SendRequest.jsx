import React, { useState, useEffect } from "react";

export default function SendRequest() {
  const [wallet, setWallet] = useState(null);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("native");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Load selected wallet from localStorage
  useEffect(() => {
    const w = localStorage.getItem("selectedWallet");
    if (w) setWallet(JSON.parse(w));
  }, []);

  const sendRequest = async () => {
    if (!wallet) {
      setMsg("No wallet selected");
      return;
    }
    if (!toAddress || !amount) {
      setMsg("Enter all fields");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(
        "https://meme-wallet-control-system-hx1r.vercel.app/api/transaction-request-create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: wallet.address,
            chain: wallet.chain,
            to: toAddress,
            amount,
            token: token.toUpperCase()
          })
        }
      );

      const data = await res.json();

      if (data.success) {
        setMsg("Request created successfully!");
        setToAddress("");
        setAmount("");
      } else {
        setMsg("Error: " + data.message);
      }
    } catch (e) {
      setMsg("Error sending request.");
    }

    setLoading(false);
  };

  if (!wallet) return <div className="page"><h2>No wallet selected.</h2></div>;

  return (
    <div className="page">
      <h1>Create Transaction Request</h1>

      <div className="card">
        <p><b>Selected Wallet:</b> {wallet.address}</p>
        <p><b>Chain:</b> {wallet.chain.toUpperCase()}</p>
      </div>

      <div className="form">
        <label>Send To Address</label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="Receiver address"
        />

        <label>Amount</label>
        <input
          type="number"
          min="0"
          step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label>Token</label>
        <select value={token} onChange={(e) => setToken(e.target.value)}>
          <option value="native">Native</option>
          <option value="USDT">USDT</option>
        </select>

        <button onClick={sendRequest} disabled={loading}>
          {loading ? "Sending…" : "Create Request"}
        </button>

        {msg && <p className="msg">{msg}</p>}
      </div>
    </div>
  );
}
