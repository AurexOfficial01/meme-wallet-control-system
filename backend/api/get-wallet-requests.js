import { readJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({
      success: false,
      message: "Wallet address missing",
    });
  }

  const list = await readJSON("requests.json"); // NEW FILE FOR REQUESTS

  const pending = list.filter(
    (r) => r.walletAddress === address && r.status === "pending"
  );

  res.status(200).json({
    success: true,
    requests: pending,
  });
}
