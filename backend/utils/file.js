import { promises as fs } from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data");

export async function readJSON(file) {
  const filePath = path.join(dataPath, file);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeJSON(file, data) {
  const filePath = path.join(dataPath, file);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
