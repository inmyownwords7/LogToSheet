import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

for (const file of ["appsscript.json"]) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(dist, file));
    console.log(`Copied ${file} -> dist/${file}`);
  } else {
    console.warn(`Missing ${file} at project root (skipped)`);
  }
}