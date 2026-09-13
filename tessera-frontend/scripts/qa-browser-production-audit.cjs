// Playwright Production Browser & Network Audit Script for Vercel Frontend
const { chromium } = require('playwright');
const fs = require('fs');

const PROD_FRONTEND_URL = 'https://personal-finance-manager-frontends.vercel.app/';

async function runBrowserAudit() {
  console.log('=== STARTING PLAYWRIGHT BROWSER & NETWORK AUDIT ===');
  console.log('Target Frontend:', PROD_FRONTEND_URL);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const networkRequests = [];
  const wsConnections = [];
  const consoleErrors = [];

  page.on('request', req => {
    networkRequests.push({ url: req.url(), method: req.method() });
  });

  page.on('websocket', ws => {
    console.log('✓ BROWSER WEBSOCKET CREATED:', ws.url());
    wsConnections.push(ws.url());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[BROWSER CONSOLE ERROR]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  // 1. Visit Landing Page
  console.log('\n--- 1. VISITING LANDING PAGE ---');
  await page.goto(PROD_FRONTEND_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const landingTitle = await page.title();
  console.log('Landing Title:', landingTitle);

  // Capture Desktop Landing Screenshot
  if (!fs.existsSync('qa-screenshots')) fs.mkdirSync('qa-screenshots');
  await page.screenshot({ path: 'qa-screenshots/prod_landing_desktop.png' });

  // 2. Click Open Room
  console.log('\n--- 2. CREATING ROOM FROM FRONTEND UI ---');
  const createButton = page.locator('#create-room-btn').first();
  await createButton.click();

  await page.waitForURL(url => url.pathname.includes('/room/'), { timeout: 20000 });
  const roomUrl = page.url();
  console.log('✓ Navigated to Room URL:', roomUrl);

  await page.waitForTimeout(3000);

  // Capture Desktop Room Screenshot
  await page.screenshot({ path: 'qa-screenshots/prod_room_desktop.png' });

  // 3. Viewport Audits (Tablet & Mobile)
  console.log('\n--- 3. VIEWPORT AUDITS ---');
  // Tablet
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa-screenshots/prod_room_tablet.png' });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa-screenshots/prod_room_mobile.png' });

  await browser.close();

  // 4. Audit Traffic
  console.log('\n--- 4. TRAFFIC & SECURITY AUDIT SUMMARY ---');
  console.log('Total Network Requests:', networkRequests.length);
  console.log('WebSocket Connections:', wsConnections);

  const obsoleteBackendCalls = networkRequests.filter(r =>
    r.url.includes('personal-finance-api.onrender.com') || r.url.includes('localhost:8080')
  );
  console.log('Obsolete Backend Calls Detected:', obsoleteBackendCalls.length);

  const tesseraBackendCalls = networkRequests.filter(r =>
    r.url.includes('tessera-e1w0.onrender.com')
  );
  console.log('Tessera Render Backend Calls:', tesseraBackendCalls.length);

  console.log('\n=== BROWSER AUDIT COMPLETE ===');
}

runBrowserAudit().catch(err => {
  console.error('BROWSER AUDIT ERROR:', err);
  process.exit(1);
});
