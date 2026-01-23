import fetch from "node-fetch";

export default async function handler(req, res) {
  const { address, chain } = req.query || {};

  if (!address || !chain) {
    return res.status(400).json({ success: false, error: "Missing params" });
  }

  try {
    const chainLower = chain.toLowerCase();

    // ================================
    // EVM CHAINS (ETH, BSC, POLYGON)
    // ================================
    if (chainLower === "evm") {
      const url = `https://api.blockcypher.com/v1/eth/main/addrs/${address}/balance`;
      const r = await fetch(url);
      const j = await r.json();

      return res.json({
        success: true,
        native: j.balance / 1e18, // ETH
        usdt: null
      });
    }

    // ================================
    // SOLANA BALANCE
    // ================================
    if (chainLower === "solana") {
      const rpc = "https://api.mainnet-beta.solana.com";
      const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address]
      };

      const r = await fetch(rpc, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      });

      const j = await r.json();

      return res.json({
        success: true,
        native: j.result.value / 1e9,
        usdt: null
      });
    }

    // ================================
    // TRON BALANCE
    // ================================
    if (chainLower === "tron") {
      const url = `https://api.trongrid.io/v1/accounts/${address}`;
      const r = await fetch(url);
      const j = await r.json();

      return res.json({
        success: true,
        native: j.data?.[0]?.balance / 1e6 || 0,
        usdt: null
      });
    }

    return res.json({ success: false, error: "Invalid chain" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
