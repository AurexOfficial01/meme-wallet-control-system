export default async function handler(req, res) {
  const { address, chain } = req.query;

  if (!address || !chain) {
    return res.status(400).json({ success: false, msg: "Missing address/chain" });
  }

  try {
    const RPC = {
      evm: "https://rpc.ankr.com/eth",
      solana: "https://api.mainnet-beta.solana.com",
      tron: "https://api.trongrid.io"
    };

    let native = 0;
    let usdt = 0;

    // =====================================
    // EVM BALANCE (ETH + USDT)
    // =====================================
    if (chain === "evm") {
      // Native ETH
      const bal = await fetch(RPC.evm, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"]
        })
      }).then(r => r.json());

      native = parseInt(bal.result, 16) / 1e18;

      // USDT ERC20
      const contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
      const methodSelector = "0x70a08231"; // balanceOf
      const paddedAddress = address.toLowerCase().replace("0x", "").padStart(64, "0");

      const usdtRes = await fetch(RPC.evm, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_call",
          params: [
            {
              to: contract,
              data: methodSelector + paddedAddress
            },
            "latest"
          ]
        })
      }).then(r => r.json());

      usdt = parseInt(usdtRes.result, 16) / 1e6;
    }

    // =====================================
    // SOLANA BALANCE (Native Only)
    // =====================================
    if (chain === "solana") {
      const sol = await fetch(RPC.solana, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address]
        })
      }).then(r => r.json());

      native = sol.result?.value ? sol.result.value / 1e9 : 0;
    }

    // =====================================
    // TRON BALANCE (Native Only)
    // =====================================
    if (chain === "tron") {
      const tron = await fetch(`${RPC.tron}/wallet/getaccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      }).then(r => r.json());

      native = tron.balance ? tron.balance / 1e6 : 0;
    }

    return res.status(200).json({
      success: true,
      native,
      usdt
    });

  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
}
