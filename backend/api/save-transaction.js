import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const { address, chain, usdt, txHash } = req.body || {};

  if (!address || !chain || !usdt || !txHash) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const list = await readJSON("transactions.json");

  list.push({
    id: Date.now(),
    address,
    chain,
    usdt,
    txHash,
    time: new Date().toISOString()
  });

  await writeJSON("transactions.json", list);

  res.status(200).json({ success: true });
}
