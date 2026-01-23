import { readJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const { address, chain } = req.query;

  if (!address || !chain) {
    return res.status(400).json({ success: false, msg: "Missing address or chain" });
  }

  try {
    // FREE RPCs (No API key required)
    const RPC = {
      evm: "https://rpc.ankr.com/eth",
      bnb: "https://rpc.ankr.com/bsc",
      polygon: "https://rpc.ankr.com/polygon",
      solana: "https://api.mainnet-beta.solana.com",
      tron: "https://api.trongrid.io"
    };

    let native = "0";
    let usdt = "0";

    // ================================
    // EVM BALANCE
    // ================================
    if (chain === "evm") {
      const wei = await fetch(RPC.evm, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"]
        })
      }).then(r => r.json());

      native = parseInt(wei.result, 16) / 1e18;

      // Read USDT ERC20
      const contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
      const balanceData =
        "0x70a08231" +
        address.replace("0x", "").padStart(64, "0");

      const usdtRes = await fetch(RPC.evm, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_call",
          params: [
            { to: contract, data: balanceData },
            "latest"
          ]
        })
      }).then(r => r.json());

      usdt = parseInt(usdtRes.result, 16) / 1e6;
    }

    // ================================
    // SOLANA BALANCE
    // ================================
    if (chain === "solana") {
      const solRes = await fetch(RPC.solana, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address]
        })
      }).then(r => r.json());

      native = solRes.result.value / 1e9;
    }

    // ================================
    // TRON BALANCE
    // ================================
    if (chain === "tron") {
      const tronRes = await fetch(`${RPC.tron}/wallet/getaccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      }).then(r => r.json());

      native = tronRes.balance ? tronRes.balance / 1e6 : 0;
    }

    return res.status(200).json({
      success: true,
      native,
      usdt
    });

  } catch (e) {
    return res.status(500).json({ success: false, msg: e.message });
  }
}
