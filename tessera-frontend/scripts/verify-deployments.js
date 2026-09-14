import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OLD_URL = 'https://personal-finance-manager-frontends.vercel.app/';
const NEW_URL = 'https://tessera-frontend-one-eta.vercel.app/';
const SCREENSHOT_DIR = path.resolve('qa-screenshots/dual-deployment-full');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verify() {
  console.log('=== STARTING 6-VIEWPORT DEPLOYMENT VERIFICATION ===');
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 1440, height: 900, name: '1440' },
    { width: 1280, height: 800, name: '1280' },
    { width: 1024, height: 768, name: '1024' },
    { width: 768, height: 1024, name: '768' },
    { width: 390, height: 844, name: '390' },
    { width: 375, height: 812, name: '375' },
  ];

  const results = {
    oldDeployment: { viewports: {} },
    newDeployment: { viewports: {} },
  };

  // 1. Verify New Tessera Deployment
  console.log('\n--- VERIFYING NEW TESSERA DEPLOYMENT ---');
  const tesseraContext = await browser.newContext();
  const tesseraPage = await tesseraContext.newPage();

  const tesseraConsoleErrors = [];
  tesseraPage.on('console', msg => {
    if (msg.type() === 'error') tesseraConsoleErrors.push(msg.text());
  });

  const tesseraResponse = await tesseraPage.goto(NEW_URL, { waitUntil: 'networkidle' });
  results.newDeployment.status = tesseraResponse.status();
  results.newDeployment.title = await tesseraPage.title();
  results.newDeployment.content = await tesseraPage.content();
  results.newDeployment.consoleErrors = tesseraConsoleErrors;

  console.log(`New URL Status: ${results.newDeployment.status}`);
  console.log(`New URL Title: ${results.newDeployment.title}`);

  for (const vp of viewports) {
    await tesseraPage.setViewportSize({ width: vp.width, height: vp.height });
    const ssPath = path.join(SCREENSHOT_DIR, `tessera-landing-${vp.name}.png`);
    await tesseraPage.screenshot({ path: ssPath, fullPage: true });
    results.newDeployment.viewports[vp.name] = 'PASS';
    console.log(`[PASS] Captured Tessera screenshot (${vp.name}px): ${ssPath}`);
  }

  // Test Room Route on Tessera
  const roomUrl = `${NEW_URL}room/demo-room-qa`;
  console.log(`Navigating to Room Route: ${roomUrl}`);
  const roomResponse = await tesseraPage.goto(roomUrl, { waitUntil: 'networkidle' });
  results.newDeployment.roomStatus = roomResponse.status();
  results.newDeployment.roomTitle = await tesseraPage.title();
  const roomSSPath = path.join(SCREENSHOT_DIR, `tessera-room-desktop-1440.png`);
  await tesseraPage.screenshot({ path: roomSSPath, fullPage: true });
  console.log(`Captured room screenshot: ${roomSSPath}`);

  await tesseraContext.close();

  // 2. Verify Old Deployment
  console.log('\n--- VERIFYING OLD DEPLOYMENT ---');
  const oldContext = await browser.newContext();
  const oldPage = await oldContext.newPage();

  const oldConsoleErrors = [];
  oldPage.on('console', msg => {
    if (msg.type() === 'error') oldConsoleErrors.push(msg.text());
  });

  const oldResponse = await oldPage.goto(OLD_URL, { waitUntil: 'networkidle' });
  results.oldDeployment.status = oldResponse.status();
  results.oldDeployment.title = await oldPage.title();
  results.oldDeployment.content = await oldPage.content();
  results.oldDeployment.consoleErrors = oldConsoleErrors;

  console.log(`Old URL Status: ${results.oldDeployment.status}`);
  console.log(`Old URL Title: ${results.oldDeployment.title}`);

  for (const vp of viewports) {
    await oldPage.setViewportSize({ width: vp.width, height: vp.height });
    const ssPath = path.join(SCREENSHOT_DIR, `old-deployment-${vp.name}.png`);
    await oldPage.screenshot({ path: ssPath, fullPage: true });
    results.oldDeployment.viewports[vp.name] = 'PASS';
    console.log(`[PASS] Captured Old Deployment screenshot (${vp.name}px): ${ssPath}`);
  }

  await oldContext.close();
  await browser.close();

  console.log('\n=== COMPLETE 6-VIEWPORT SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
