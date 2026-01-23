import { readJSON, writeJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const { requestId, status, txHash } = req.body;

  if (!requestId || !status) {
    return res.status(400).json({
      success: false,
      message: "Missing requestId or status",
    });
  }

  const list = await readJSON("requests.json");

  const updated = list.map((r) =>
    r.id === requestId ? { ...r, status, txHash } : r
  );

  await writeJSON("requests.json", updated);

  res.status(200).json({ success: true });
}
