import { readJSON } from "../utils/file.js";

export default async function handler(req, res) {
  const orders = await readJSON("orders.json");
  res.status(200).json(orders);
}
