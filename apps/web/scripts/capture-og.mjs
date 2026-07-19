import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.OG_TARGET_URL || 'https://urlytix.com';
const out = path.resolve(__dirname, '../src/app/opengraph-image.png');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});

await page.goto(target, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });

await browser.close();
console.log('saved', out);
