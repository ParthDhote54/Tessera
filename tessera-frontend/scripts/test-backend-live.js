const RENDER_HTTP = 'https://tessera-e1w0.onrender.com';
const RENDER_WS = 'wss://tessera-e1w0.onrender.com/ws';

const ORIGIN_TESSERA = 'https://tessera-frontend-one-eta.vercel.app';
const ORIGIN_PFM = 'https://personal-finance-manager-frontends.vercel.app';

async function testBackend() {
  console.log('=== PHASE 2 DIRECT BACKEND TESTS ===');

  // 1. Health check
  console.log('\n--- 1. Testing GET /api/health ---');
  try {
    const res = await fetch(`${RENDER_HTTP}/api/health`);
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Health test error:', err.message);
  }

  // 2. Room creation without Origin header
  console.log('\n--- 2. Testing POST /api/rooms (No Origin) ---');
  try {
    const res = await fetch(`${RENDER_HTTP}/api/rooms`, { method: 'POST' });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Room create error:', err.message);
  }

  // 3. CORS OPTIONS test for Tessera frontend origin
  console.log('\n--- 3. Testing OPTIONS /api/rooms (Origin: Tessera) ---');
  try {
    const res = await fetch(`${RENDER_HTTP}/api/rooms`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN_TESSERA,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    console.log('Status:', res.status);
    console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('Access-Control-Allow-Credentials:', res.headers.get('access-control-allow-credentials'));
  } catch (err) {
    console.error('CORS Tessera error:', err.message);
  }

  // 4. CORS OPTIONS test for PFM origin
  console.log('\n--- 4. Testing OPTIONS /api/rooms (Origin: PFM) ---');
  try {
    const res = await fetch(`${RENDER_HTTP}/api/rooms`, {
      method: 'OPTIONS',
      headers: {
        'Origin': ORIGIN_PFM,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    console.log('Status:', res.status);
    console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
  } catch (err) {
    console.error('CORS PFM error:', err.message);
  }

  // 5. WebSocket test
  console.log('\n--- 5. Testing WebSocket /ws ---');
  await new Promise(resolve => {
    try {
      const ws = new WebSocket(RENDER_WS);

      ws.onopen = () => {
        console.log('[SUCCESS] WebSocket connected!');
        ws.close();
        resolve();
      };

      ws.onerror = (err) => {
        console.error('[FAIL] WebSocket error:', err.message || err);
        resolve();
      };

      setTimeout(() => {
        console.log('[TIMEOUT] WebSocket connection timed out after 5s');
        ws.close();
        resolve();
      }, 5000);
    } catch (e) {
      console.error('WebSocket exception:', e.message);
      resolve();
    }
  });
}

testBackend();
