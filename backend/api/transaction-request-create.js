import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "POST only" });
  }

  const { walletAddress, chain, to, amount, token } = req.body;

  if (!walletAddress || !chain || !to || !amount || !token) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
    const list = await readJSON("requests.json");

    const entry = {
      id: Date.now(),
      wallet: walletAddress,
      chain,
      to,
      amount,
      token,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    list.push(entry);
    await writeJSON("requests.json", list);

    return res.status(200).json({
      success: true,
      message: "Request saved",
      request: entry
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error saving request"
    });
  }
}
