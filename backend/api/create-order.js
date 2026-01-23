import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const { address, chain, amount } = req.body || {};

  if (!address || !chain || !amount) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const orders = await readJSON("orders.json");

  const newOrder = {
    id: Date.now(),
    address,
    chain,
    amount,
    time: new Date().toISOString()
  };

  orders.push(newOrder);
  await writeJSON("orders.json", orders);

  res.status(200).json({ success: true, order: newOrder });
}
