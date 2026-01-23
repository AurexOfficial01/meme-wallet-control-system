import React, { useState, useEffect } from "react";

export default function SendRequest() {
  const urlParams = new URLSearchParams(window.location.search);

  const wallet = urlParams.get("wallet");
  const chain = urlParams.get("chain");

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDT");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!wallet || !to || !amount) {
      setMsg("Missing required fields");
      return;
    }

    setLoading(true);

    const res = await fetch(
      "https://meme-wallet-control-system-hx1r.vercel.app/api/transaction-request-create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          chain,
          to,
          amount: Number(amount),
          token
        })
      }
    );

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      setMsg("Request Sent Successfully ✔");
      setAmount("");
      setTo("");
    } else {
      setMsg("Error sending request");
    }
  };

  return (
    <div className="page">
      <h1>Send Transaction Request</h1>

      <div className="form-card">
        <p><b>User Wallet:</b> {wallet}</p>
        <p><b>Chain:</b> {chain}</p>

        <label>Send To Address</label>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Receiver address"
        />

        <label>Amount</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          type="number"
        />

        <label>Token</label>
        <select value={token} onChange={(e) => setToken(e.target.value)}>
          <option value="USDT">USDT (ERC20/TRC20/SPL)</option>
          <option value="NATIVE">Native Coin (ETH/SOL/TRX)</option>
        </select>

        <button onClick={submit} className="btn btn-primary" disabled={loading}>
          {loading ? "Sending..." : "Send Request"}
        </button>

        {msg && <p style={{ marginTop: "10px" }}>{msg}</p>}
      </div>
    </div>
  );
}
