import { access, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const tasks = [
  ["data/portfolio.example.json", "data/portfolio.json"],
  ["data/strategy.example.json", "data/strategy.json"],
];

for (const [sourceRelativePath, targetRelativePath] of tasks) {
  const sourcePath = path.join(projectRoot, sourceRelativePath);
  const targetPath = path.join(projectRoot, targetRelativePath);

  try {
    await access(targetPath);
    console.log(`skip ${targetRelativePath} (already exists)`);
  } catch {
    await copyFile(sourcePath, targetPath);
    console.log(`create ${targetRelativePath} from ${sourceRelativePath}`);
  }
}
