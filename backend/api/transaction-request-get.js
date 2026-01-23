export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ success: false, message: "Address required" });
  }

  const { readJSON } = await import("../utils/file.js");
  const list = await readJSON("requests.json");

  const pending = list.filter(r => 
    r.walletAddress.toLowerCase() === address.toLowerCase() &&
    r.status === "pending"
  );

  return res.status(200).json({ success: true, requests: pending });
}
