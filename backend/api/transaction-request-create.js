export default async function handler(req, res) {
  const { walletAddress, chain, toAddress, tokenType, amount } = req.body || {};

  if (!walletAddress || !chain || !toAddress || !amount || !tokenType) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  // Read existing requests
  const { readJSON, writeJSON } = await import("../utils/file.js");
  const requests = await readJSON("requests.json");

  const request = {
    id: Date.now(),
    walletAddress,
    chain,
    toAddress,
    tokenType,       // "native" or "usdt"
    amount,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  requests.push(request);
  await writeJSON("requests.json", requests);

  return res.status(200).json({
    success: true,
    request
  });
}
