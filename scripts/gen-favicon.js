import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgPath = path.join(__dirname, "..", "public", "img", "summary green.jpeg");
const buf = fs.readFileSync(imgPath);
const base64 = buf.toString("base64");
const dataUri = "data:image/jpeg;base64," + base64;

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
  '  <defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>',
  '  <image href="' + dataUri + '" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>',
  "</svg>",
].join("\n");

const outPath = path.join(__dirname, "..", "public", "favicon.svg");
fs.writeFileSync(outPath, svg);
console.log("favicon.svg written with embedded image");
