import { readJSON, writeJSON } from "../../utils/file.js";

export default async function handler(req, res) {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ success: false, message: "Missing ID" });
  }

  try {
    const list = await readJSON("requests.json");

    const index = list.findIndex((r) => r.id === requestId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    list[index].status = "rejected";
    list[index].updatedAt = new Date().toISOString();

    await writeJSON("requests.json", list);

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Error" });
  }
}
