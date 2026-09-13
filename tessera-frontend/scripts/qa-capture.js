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

async function captureLanding(baseUrl = 'http://localhost:5173', iterationName = 'iteration-01') {
  const targetLandingDir = path.join('design-qa', 'landing', iterationName);
  console.log(`\n============================================================`);
  console.log(`LANDING PAGE QA CAPTURE — ${targetLandingDir}`);
  console.log(`============================================================`);

  fs.mkdirSync(targetLandingDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);

    const outPath = path.join(targetLandingDir, `${vp.name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`  ✓ ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log(`============================================================\n`);
}

const iterationArg = process.argv[2] || 'iteration-01';
captureLanding('http://localhost:5173', iterationArg).catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});

