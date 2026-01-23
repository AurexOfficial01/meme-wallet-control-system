export default async function handler(req, res) {
  const { requestId, status, txHash } = req.body;

  if (!requestId || !status) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const { readJSON, writeJSON } = await import("../utils/file.js");
  const list = await readJSON("requests.json");

  const idx = list.findIndex(r => r.id == requestId);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Request not found" });
  }

  list[idx].status = status;
  if (txHash) list[idx].txHash = txHash;
  list[idx].updatedAt = new Date().toISOString();

  await writeJSON("requests.json", list);

  return res.status(200).json({ success: true });
}
