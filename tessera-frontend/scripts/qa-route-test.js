import { chromium } from 'playwright';

async function runRouteTests() {
  console.log(`============================================================`);
  console.log(`FRONTEND ROUTE QA TEST SUITE (INTERACTION & ROUTING DEEP AUDIT)`);
  console.log(`============================================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = 'http://localhost:5173';

  // 1. Landing Page (/) & Creation Interaction
  console.log(`1. Testing Route: / (Landing Page Interaction)`);
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const landingHeading = await page.innerText('h1');
  console.log(`   ✓ Landing page loaded with heading: "${landingHeading.replace(/\n/g, ' ')}"`);
  if (!landingHeading.includes('Compose together')) {
    throw new Error('Landing page heading mismatch');
  }

  // Click CTA to trigger room creation and navigation
  console.log(`2. ACTION: Clicking "Open a room" CTA button`);
  await page.click('#create-room-btn');
  await page.waitForURL(/\/room\/.+/);
  await page.waitForTimeout(1200); // Allow WS connection and room layout rendering

  const currentUrl = page.url();
  console.log(`   ✓ OBSERVED EFFECT: Successfully created room and navigated to: ${currentUrl}`);

  // Assert room stage elements
  const canvasStage = await page.$('.canvas-stage');
  const dock = await page.$('.collab-dock');
  if (!canvasStage || !dock) {
    throw new Error('Room page stage or collaboration dock missing after navigation');
  }
  console.log(`   ✓ Stage & Collaboration Dock rendered in newly created room`);

  // 3. Fallback Route (/random-404-path)
  console.log(`3. Testing Route: /random-404-path (NotFound & Fallback)`);
  await page.goto(`${baseUrl}/random-404-path`, { waitUntil: 'networkidle' });
  const notFoundText = await page.innerText('.not-found-title');
  console.log(`   ✓ NotFound page loaded with title: "${notFoundText}"`);
  if (!notFoundText.includes('This path is empty')) {
    throw new Error('NotFound page title mismatch');
  }

  // Click return home button on 404 card
  const returnBtn = await page.$('.not-found-actions button');
  if (returnBtn) {
    await returnBtn.click();
    await page.waitForURL(`${baseUrl}/`);
    console.log(`   ✓ Returned to Landing Page cleanly via 404 return action`);
  }

  await browser.close();
  console.log(`============================================================`);
  console.log(`SUCCESS: All frontend route interactions & state changes verified`);
  console.log(`============================================================\n`);
}

runRouteTests().catch((err) => {
  console.error('Route Test Failed:', err);
  process.exit(1);
});
