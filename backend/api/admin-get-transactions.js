import { readJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const tx = await readJSON("transactions.json");
  res.status(200).json(tx);
}
