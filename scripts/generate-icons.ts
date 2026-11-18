import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Sampled from the artwork's background so the maskable padding blends in.
const BG = "#14275E";
const source = await readFile("assets/icon/icon-source.png");
const dataUrl = `data:image/png;base64,${source.toString("base64")}`;

// Maskable icons keep content inside the central 80% safe zone.
const outputs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, scale: 1 },
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.8 },
  { file: "src/app/apple-icon.png", size: 180, scale: 1 },
  { file: "src/app/icon.png", size: 48, scale: 1 },
];

await mkdir("public/icons", { recursive: true });
const browser = await chromium.launch();
try {
  for (const { file, size, scale } of outputs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const inner = Math.round(size * scale);
    await page.setContent(
      `<html><body style="margin:0;width:${size}px;height:${size}px;background:${BG};display:flex;align-items:center;justify-content:center">` +
        `<img src="${dataUrl}" width="${inner}" height="${inner}"></body></html>`,
    );
    await page.screenshot({ path: file });
    await page.close();
    console.log(`wrote ${file}`);
  }
} finally {
  await browser.close();
}
