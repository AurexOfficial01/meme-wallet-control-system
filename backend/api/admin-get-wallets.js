import { readJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const wallets = await readJSON("wallets.json");
  res.status(200).json(wallets);
}
