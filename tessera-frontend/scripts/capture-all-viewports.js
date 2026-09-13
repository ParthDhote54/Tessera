import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
  { name: '375', width: 375, height: 812 },
];

const routes = [
  { name: 'landing', path: '/' },
  { name: 'room', path: '/room/demo-room' },
  { name: 'not-found', path: '/random-404-path' },
];

async function captureAll(iterationName) {
  const targetIter = iterationName || process.argv[2] || 'iteration-001';
  console.log(`============================================================`);
  console.log(`CAPTURING SCREENSHOT EVIDENCE FOR: ${targetIter}`);
  console.log(`============================================================`);

  const browser = await chromium.launch({ headless: true });

  for (const route of routes) {
    const routeDir = path.join(process.cwd(), 'design-qa', targetIter, route.name);
    fs.mkdirSync(routeDir, { recursive: true });

    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2, // High DPI for crisp rendering
      });
      const page = await context.newPage();
      const url = `http://localhost:5173${route.path}`;

      console.log(`Capturing [${route.name}] @ ${vp.width}x${vp.height}...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000); // Allow WS state and animations to settle

      const filePath = path.join(routeDir, `${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`   ✓ Saved screenshot: ${filePath}`);

      await context.close();
    }
  }

  await browser.close();
  console.log(`============================================================`);
  console.log(`SUCCESS: Completed capture for ${targetIter}`);
  console.log(`============================================================\n`);
}

captureAll();
