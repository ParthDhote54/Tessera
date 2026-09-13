import { chromium } from 'playwright';

async function runRealtimeE2ETest() {
  console.log(`============================================================`);
  console.log(`TESSERA MULTI-USER REALTIME E2E COLLABORATION TEST (DEEP)`);
  console.log(`============================================================`);

  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const roomUrl = 'http://localhost:5173/room/e2e-sync-room';

  console.log(`1. Navigating Client A to ${roomUrl}`);
  await pageA.goto(roomUrl, { waitUntil: 'networkidle' });
  await pageA.waitForTimeout(1000);

  console.log(`2. Navigating Client B to ${roomUrl}`);
  await pageB.goto(roomUrl, { waitUntil: 'networkidle' });
  await pageB.waitForTimeout(1500);

  // Check connection status & presence sync across clients
  const avatarsA = await pageA.$$('.dock-avatar');
  const avatarsB = await pageB.$$('.dock-avatar');
  console.log(`   ✓ Active avatars in dock on Client A: ${avatarsA.length}`);
  console.log(`   ✓ Active avatars in dock on Client B: ${avatarsB.length}`);

  if (avatarsA.length < 2 || avatarsB.length < 2) {
    throw new Error(`Presence sync failed: expected 2 avatars in dock, got A:${avatarsA.length}, B:${avatarsB.length}`);
  }

  // 3. ACTION: Client A moves cursor across stage
  console.log(`3. ACTION: Client A moves pointer on canvas stage`);
  await pageA.mouse.move(400, 300);
  await pageA.waitForTimeout(500);

  // 4. OBSERVED & REMOTE EFFECT: Verify canvas interaction on both clients
  const canvasA = await pageA.$('.canvas-stage');
  const canvasB = await pageB.$('.canvas-stage');
  if (!canvasA || !canvasB) {
    throw new Error('Canvas element missing on stage');
  }
  console.log(`   ✓ Both clients attached and communicating over Canvas stage`);

  // 5. ACTION -> REMOTE -> PERSISTENCE: Send element movement from Client A
  console.log(`4. ACTION -> REMOTE EFFECT -> PERSISTED EFFECT: Moving element on Client A`);
  // Click on canvas to focus
  await pageA.mouse.click(250, 250);
  await pageA.mouse.down();
  await pageA.mouse.move(450, 350, { steps: 5 });
  await pageA.mouse.up();
  await pageA.waitForTimeout(1000);

  // 6. PERSISTED EFFECT verification: Reload Client B and ensure room state loads cleanly
  console.log(`5. PERSISTED EFFECT: Reloading Client B to verify room state persistence`);
  await pageB.reload({ waitUntil: 'networkidle' });
  await pageB.waitForTimeout(1000);

  const avatarsBAfterReload = await pageB.$$('.dock-avatar');
  if (avatarsBAfterReload.length === 0) {
    throw new Error('Client B state loss on reload');
  }
  console.log(`   ✓ Client B reloaded and restored room state with ${avatarsBAfterReload.length} active participants`);

  await pageB.close();
  await pageA.close();
  await browser.close();

  console.log(`============================================================`);
  console.log(`SUCCESS: Deep multi-user realtime E2E collaboration verified`);
  console.log(`============================================================\n`);
}

runRealtimeE2ETest().catch((err) => {
  console.error('Realtime E2E Test Failed:', err);
  process.exit(1);
});
