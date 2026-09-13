import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
];

async function captureRoom(baseUrl = 'http://localhost:5173', roomPath = '/room/demo-room', targetSubdir = 'baseline') {
  const targetDir = path.join('design-qa', 'room', targetSubdir);
  console.log(`\n============================================================`);
  console.log(`ROOM QA CAPTURE — ${targetDir}`);
  console.log(`============================================================`);

  fs.mkdirSync(targetDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${baseUrl}${roomPath}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);

    const outPath = path.join(targetDir, `${vp.name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`  ✓ ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log(`============================================================\n`);
}

const targetArg = process.argv[2] || 'baseline';
captureRoom('http://localhost:5173', '/room/demo-room', targetArg).catch((err) => {
  console.error('Room capture failed:', err);
  process.exit(1);
});
