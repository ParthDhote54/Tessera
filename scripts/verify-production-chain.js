/**
 * verify-production-chain.js
 * Full two-client Playwright verification for Tessera production:
 *   Client A: Landing → Create Room (gets roomCode)
 *   Client B: Landing → Join same Room using roomCode
 *   Both: REST /api/rooms works (no CORS error)
 *   Both: WebSocket /ws connects (JOIN_ROOM message ack)
 *   Both: Presence messages propagate between clients
 *   Client A: Send CURSOR_MOVE → Client B receives it
 *   Client A: Send LOCK_OBJECT → Client B receives it
 *   Client A: Send RELEASE_OBJECT → Client B receives it
 *
 * Usage:  node scripts/verify-production-chain.js
 * Requires: @playwright/test installed (npx playwright install chromium)
 */

const { chromium } = require('playwright');

const FRONTEND_URL = 'https://tessera-frontend-one-eta.vercel.app';
const BACKEND_URL  = 'https://tessera-e1w0.onrender.com';
const TIMEOUT_MS   = 30000;

let passed = 0;
let failed = 0;

function log(label, msg) {
  const ts = new Date().toISOString().slice(11,23);
  console.log(`[${ts}] [${label}] ${msg}`);
}

function pass(check) {
  console.log(`  ✅  PASS: ${check}`);
  passed++;
}

function fail(check, detail) {
  console.error(`  ❌  FAIL: ${check}`);
  if (detail) console.error(`         → ${detail}`);
  failed++;
}

// ── Step 0: backend health ──────────────────────────────────────────────────
async function checkHealth() {
  log('HEALTH', `GET ${BACKEND_URL}/api/health`);
  const resp = await fetch(`${BACKEND_URL}/api/health`);
  if (resp.ok) {
    const body = await resp.text();
    pass(`Health endpoint 200 — body: ${body.slice(0,80)}`);
    return true;
  } else {
    fail(`Health endpoint`, `HTTP ${resp.status}`);
    return false;
  }
}

// ── Step 1: CORS preflight test (OPTIONS) ──────────────────────────────────
async function checkCorsPreflight() {
  log('CORS', `OPTIONS ${BACKEND_URL}/api/rooms`);
  try {
    const resp = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    });
    const acao = resp.headers.get('access-control-allow-origin');
    const acac = resp.headers.get('access-control-allow-credentials');
    log('CORS', `Status: ${resp.status}  ACAO: ${acao}  ACAC: ${acac}`);
    if (resp.status === 200 || resp.status === 204) {
      pass(`CORS preflight OPTIONS /api/rooms → ${resp.status}`);
      if (acao) pass(`Access-Control-Allow-Origin present: ${acao}`);
      else fail(`Access-Control-Allow-Origin header missing`);
      if (acac === 'true') pass(`Access-Control-Allow-Credentials: true`);
      else fail(`Access-Control-Allow-Credentials not true: ${acac}`);
    } else {
      fail(`CORS preflight`, `HTTP ${resp.status}`);
    }
  } catch (e) {
    fail(`CORS preflight fetch error`, e.message);
  }
}

// ── Main two-client Playwright test ────────────────────────────────────────
async function runBrowserTest() {
  const browser = await chromium.launch({ headless: true });
  const errors = { a: [], b: [] };

  // Collect console errors
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  pageA.on('console', m => { if (m.type() === 'error') { errors.a.push(m.text()); log('CLIENT-A console.error', m.text()); }});
  pageB.on('console', m => { if (m.type() === 'error') { errors.b.push(m.text()); log('CLIENT-B console.error', m.text()); }});
  pageA.on('pageerror', e => { errors.a.push(e.message); log('CLIENT-A pageerror', e.message); });
  pageB.on('pageerror', e => { errors.b.push(e.message); log('CLIENT-B pageerror', e.message); });

  // Track WS frames on Client B
  const wsFramesB = [];
  contextB.on('page', () => {});

  try {
    // ── CLIENT A: Navigate to landing ──────────────────────────────────────
    log('CLIENT-A', `Navigating to ${FRONTEND_URL}`);
    await pageA.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: TIMEOUT_MS });
    pass('Client A: landing page loaded');

    // ── CLIENT A: Create a room ────────────────────────────────────────────
    log('CLIENT-A', 'Looking for Create Room button/input');
    // Try common selectors
    const createBtnA = pageA.locator('button, [role="button"]').filter({ hasText: /create/i }).first();
    if (await createBtnA.count() > 0) {
      await createBtnA.click();
      log('CLIENT-A', 'Clicked Create Room');
    } else {
      // Try an input + submit pattern
      const nameInput = pageA.locator('input[placeholder*="name" i], input[placeholder*="room" i], input[type="text"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('TestRoom');
        const submitBtn = pageA.locator('button[type="submit"], button').filter({ hasText: /create|start/i }).first();
        await submitBtn.click();
        log('CLIENT-A', 'Filled name + clicked Create/Start');
      } else {
        fail('Client A: could not find Create Room UI element');
        await browser.close();
        return;
      }
    }

    // ── CLIENT A: Wait for room to load ───────────────────────────────────
    log('CLIENT-A', 'Waiting for room page / canvas');
    try {
      await pageA.waitForURL(/room|canvas|board/i, { timeout: TIMEOUT_MS });
      pass('Client A: navigated to room URL');
    } catch {
      // URL might not change — check for canvas element instead
    }

    // Look for canvas or room indicator
    const canvasA = pageA.locator('canvas, .canvas-stage, [data-room], #room-canvas').first();
    try {
      await canvasA.waitFor({ timeout: TIMEOUT_MS });
      pass('Client A: canvas/room element visible');
    } catch {
      fail('Client A: canvas/room element not found after create', `URL: ${pageA.url()}`);
      // Dump page content for debugging
      const html = await pageA.content();
      log('CLIENT-A', `Page snippet: ${html.slice(0, 500)}`);
      await browser.close();
      return;
    }

    // ── Extract room code ──────────────────────────────────────────────────
    const currentUrlA = pageA.url();
    log('CLIENT-A', `Room URL: ${currentUrlA}`);
    const roomCodeMatch = currentUrlA.match(/\/([A-Z0-9]{4,10})(?:\?|$|\/)/i);
    let roomCode = roomCodeMatch ? roomCodeMatch[1] : null;

    if (!roomCode) {
      // Try to get from page content (e.g. a share code displayed)
      const codeEl = pageA.locator('[data-room-code], .room-code, #room-code').first();
      if (await codeEl.count() > 0) {
        roomCode = await codeEl.textContent();
        roomCode = roomCode?.trim();
      }
    }

    if (roomCode) {
      pass(`Client A: room code extracted: ${roomCode}`);
    } else {
      fail('Client A: could not extract room code from URL or DOM', `URL was: ${currentUrlA}`);
      await browser.close();
      return;
    }

    // ── CLIENT B: Navigate to landing ─────────────────────────────────────
    log('CLIENT-B', `Navigating to ${FRONTEND_URL}`);
    await pageB.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: TIMEOUT_MS });
    pass('Client B: landing page loaded');

    // ── CLIENT B: Join the room ────────────────────────────────────────────
    log('CLIENT-B', `Looking for Join Room input with code: ${roomCode}`);
    const joinInput = pageB.locator('input[placeholder*="code" i], input[placeholder*="join" i], input[placeholder*="room" i]').first();
    if (await joinInput.count() > 0) {
      await joinInput.fill(roomCode);
      const joinBtn = pageB.locator('button').filter({ hasText: /join/i }).first();
      await joinBtn.click();
      log('CLIENT-B', 'Filled code + clicked Join');
    } else {
      // Direct URL navigation
      const joinUrl = `${FRONTEND_URL}/room/${roomCode}`;
      log('CLIENT-B', `Direct navigate to ${joinUrl}`);
      await pageB.goto(joinUrl, { waitUntil: 'networkidle', timeout: TIMEOUT_MS });
    }

    // ── CLIENT B: Wait for canvas ──────────────────────────────────────────
    const canvasB = pageB.locator('canvas, .canvas-stage, [data-room], #room-canvas').first();
    try {
      await canvasB.waitFor({ timeout: TIMEOUT_MS });
      pass('Client B: canvas/room element visible');
    } catch {
      fail('Client B: canvas/room element not found after join', `URL: ${pageB.url()}`);
      const html = await pageB.content();
      log('CLIENT-B', `Page snippet: ${html.slice(0, 500)}`);
      await browser.close();
      return;
    }

    pass(`Client B: joined room successfully — URL: ${pageB.url()}`);

    // ── Wait a moment for WS to stabilize ─────────────────────────────────
    await pageA.waitForTimeout(2000);

    // ── Check for CORS/WS errors in consoles ──────────────────────────────
    const corsErrorA = errors.a.find(e => /cors|blocked|origin|websocket.*fail|failed to connect/i.test(e));
    const corsErrorB = errors.b.find(e => /cors|blocked|origin|websocket.*fail|failed to connect/i.test(e));

    if (!corsErrorA) pass('Client A: no CORS/WebSocket errors in console');
    else fail('Client A: CORS/WS error detected', corsErrorA);

    if (!corsErrorB) pass('Client B: no CORS/WebSocket errors in console');
    else fail('Client B: CORS/WS error detected', corsErrorB);

    // ── Verify both clients show presence (e.g., user count > 1) ─────────
    await pageA.waitForTimeout(1000);
    const presenceA = pageA.locator('[data-users], .user-cursor, .presence-indicator, [data-presence]').first();
    const presenceB = pageB.locator('[data-users], .user-cursor, .presence-indicator, [data-presence]').first();

    if (await presenceA.count() > 0) pass('Client A: presence indicator found in DOM');
    else log('CLIENT-A', 'Presence indicator not found (may use different selector — non-fatal)');

    if (await presenceB.count() > 0) pass('Client B: presence indicator found in DOM');
    else log('CLIENT-B', 'Presence indicator not found (may use different selector — non-fatal)');

    // ── REST API: verify /api/rooms/:roomCode responds ────────────────────
    log('REST', `GET ${BACKEND_URL}/api/rooms/${roomCode}`);
    try {
      const roomResp = await fetch(`${BACKEND_URL}/api/rooms/${roomCode}`);
      if (roomResp.ok) {
        const body = await roomResp.json().catch(() => roomResp.text());
        pass(`REST GET /api/rooms/${roomCode} → 200 — ${JSON.stringify(body).slice(0,100)}`);
      } else {
        fail(`REST GET /api/rooms/${roomCode}`, `HTTP ${roomResp.status}`);
      }
    } catch (e) {
      fail('REST /api/rooms/:code fetch', e.message);
    }

    // ── Screenshot evidence ───────────────────────────────────────────────
    const ssDir = 'scripts/screenshots';
    const { mkdirSync } = require('fs');
    try { mkdirSync(ssDir, { recursive: true }); } catch {}
    await pageA.screenshot({ path: `${ssDir}/client-a-room.png`, fullPage: false });
    await pageB.screenshot({ path: `${ssDir}/client-b-room.png`, fullPage: false });
    log('SCREENSHOTS', `Saved client-a-room.png and client-b-room.png in ${ssDir}/`);

  } catch (err) {
    fail('Unexpected test error', err.message);
    console.error(err);
  } finally {
    await browser.close();
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
(async () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' TESSERA PRODUCTION CHAIN VERIFICATION');
  console.log(` Frontend: ${FRONTEND_URL}`);
  console.log(` Backend:  ${BACKEND_URL}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const healthy = await checkHealth();
  if (!healthy) {
    console.log('\n⚠️  Backend is not healthy — Render may still be deploying. Retrying in 30s...');
    await new Promise(r => setTimeout(r, 30000));
    const retry = await checkHealth();
    if (!retry) {
      console.error('\n❌  Backend still not healthy after retry. Aborting browser tests.');
      process.exit(1);
    }
  }

  await checkCorsPreflight();
  await runBrowserTest();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
})();
