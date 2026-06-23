import sharp from "sharp";
import { readFileSync } from "fs";
import { mkdir } from "fs/promises";

await mkdir("public/icons", { recursive: true });
const svg = readFileSync("public/icons/c2c-logo.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icons/c2c-192.png");
console.log("✅ c2c-192.png");

await sharp(svg).resize(512, 512).png().toFile("public/icons/c2c-512.png");
console.log("✅ c2c-512.png");

// favicon.ico — 32x32
await sharp(svg).resize(32, 32).png().toFile("public/favicon-32.png");
console.log("✅ favicon-32.png (use this as favicon.ico or convert)");
