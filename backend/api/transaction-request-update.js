import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Use POST" });
  }

  const { requestId, status, txHash } = req.body;

  if (!requestId || !status) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const list = await readJSON("requests.json");
    const index = list.findIndex((r) => r.id === requestId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    list[index].status = status;
    list[index].txHash = txHash || null;
    list[index].updatedAt = new Date().toISOString();

    await writeJSON("requests.json", list);

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating request" });
  }
}
