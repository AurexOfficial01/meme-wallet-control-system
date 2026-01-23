import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Use POST" });
  }

  const { wallet, chain, to, amount, token } = req.body;

  if (!wallet || !chain || !to || !amount || !token) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const list = await readJSON("requests.json");

    const newReq = {
      id: "REQ-" + Date.now(),
      wallet,
      chain,
      to,
      amount,
      token,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      txHash: null
    };

    list.push(newReq);
    await writeJSON("requests.json", list);

    res.status(200).json({ success: true, request: newReq });
  } catch {
    res.status(500).json({ success: false, message: "Error creating request" });
  }
}
