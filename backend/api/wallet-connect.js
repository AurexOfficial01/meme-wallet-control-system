import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const { address, chain, walletName } = req.body || {};

  if (!address) {
    return res.status(400).json({ success: false, message: "Address missing" });
  }

  const list = await readJSON("wallets.json");

  list.push({
    id: Date.now(),
    address,
    chain,
    walletName,
    time: new Date().toISOString()
  });

  await writeJSON("wallets.json", list);

  res.status(200).json({ success: true });
}
