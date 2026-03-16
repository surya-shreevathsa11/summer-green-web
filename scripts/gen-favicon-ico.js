/**
 * Generates public/favicon.ico (48x48 + 32x32) and public/favicon.png (32x32)
 * from public/img/SummerGreenUpdated.jpeg for browsers and Google.
 * Run: node scripts/gen-favicon-ico.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const imgPath = path.join(publicDir, "img", "SummerGreenUpdated.jpeg");

async function run() {
  const img = sharp(imgPath);
  const png48 = await img.clone().resize(48, 48).png().toBuffer();
  const png32 = await img.clone().resize(32, 32).png().toBuffer();

  const icoBuf = await pngToIco([png32, png48]);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuf);
  fs.writeFileSync(path.join(publicDir, "favicon.png"), png32);

  console.log("public/favicon.ico and public/favicon.png written.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
