// Automated Production Verification Script for Tessera Backend & WebSocket
// Environment: wss://tessera-e1w0.onrender.com/ws

const PROD_WS_URL = 'wss://tessera-e1w0.onrender.com/ws';
const PROD_REST_URL = 'https://tessera-e1w0.onrender.com';

async function runProductionVerification() {
  console.log('=== STARTING TESSERA PRODUCTION VERIFICATION ===');
  console.log('Target REST:', PROD_REST_URL);
  console.log('Target WSS:', PROD_WS_URL);

  // 1. REST Endpoint Verification
  console.log('\n--- 1. REST API VERIFICATION ---');
  const healthRes = await fetch(`${PROD_REST_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('GET /api/health:', healthRes.status, JSON.stringify(healthData));

  const roomRes = await fetch(`${PROD_REST_URL}/api/rooms`, { method: 'POST' });
  const roomData = await roomRes.json();
  console.log('POST /api/rooms:', roomRes.status, JSON.stringify(roomData));
  const roomId = roomData.roomId;

  const roomFetchRes = await fetch(`${PROD_REST_URL}/api/rooms/${roomId}`);
  const roomFetchData = await roomFetchRes.json();
  console.log(`GET /api/rooms/${roomId}:`, roomFetchRes.status, JSON.stringify(roomFetchData));

  // 2. Single Client WebSocket Handshake & Protocol Verification
  console.log('\n--- 2. WEBSOCKET PROTOCOL VERIFICATION ---');
  const ws1 = new WebSocket(PROD_WS_URL);

  await new Promise((resolve, reject) => {
    ws1.onopen = () => {
      console.log('✓ WSS Handshake Succeeded with wss://tessera-e1w0.onrender.com/ws');
      resolve();
    };
    ws1.onerror = (err) => reject(err);
  });

  const c1Messages = [];
  let initialElements = [];
  ws1.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    c1Messages.push(msg);
    console.log('[CLIENT 1 RECEIVED]:', msg.type, JSON.stringify(msg));
    if (msg.type === 'ROOM_STATE' && msg.elements) {
      initialElements = msg.elements;
    }
  };

  // Join Room (Client 1)
  console.log('--> Client 1 sending JOIN_ROOM...');
  ws1.send(JSON.stringify({
    type: 'JOIN_ROOM',
    roomId: roomId,
    sessionId: 'client-1-sid',
    displayName: 'Tester Alice',
    color: '#6366F1'
  }));

  await new Promise(r => setTimeout(r, 1000));

  // Send Ping
  console.log('--> Client 1 sending PING...');
  const pingTime = Date.now();
  ws1.send(JSON.stringify({
    type: 'PING',
    timestamp: pingTime
  }));

  await new Promise(r => setTimeout(r, 500));

  // Send Cursor Move
  console.log('--> Client 1 sending CURSOR_MOVE...');
  ws1.send(JSON.stringify({
    type: 'CURSOR_MOVE',
    x: 0.45,
    y: 0.55
  }));

  // Send Sync Request
  console.log('--> Client 1 sending SYNC_REQUEST...');
  ws1.send(JSON.stringify({
    type: 'SYNC_REQUEST'
  }));

  await new Promise(r => setTimeout(r, 1000));

  // 3. Two-Client Realtime Synchronization Test
  console.log('\n--- 3. TWO-CLIENT REALTIME SYNCHRONIZATION TEST ---');
  const ws2 = new WebSocket(PROD_WS_URL);

  await new Promise((resolve, reject) => {
    ws2.onopen = () => {
      console.log('✓ Client 2 WSS Handshake Succeeded');
      resolve();
    };
    ws2.onerror = (err) => reject(err);
  });

  const c2Messages = [];
  ws2.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    c2Messages.push(msg);
    console.log('[CLIENT 2 RECEIVED]:', msg.type, JSON.stringify(msg));
  };

  // Client 2 Joins Same Room
  console.log('--> Client 2 sending JOIN_ROOM...');
  ws2.send(JSON.stringify({
    type: 'JOIN_ROOM',
    roomId: roomId,
    sessionId: 'client-2-sid',
    displayName: 'Tester Bob',
    color: '#EC4899'
  }));

  await new Promise(r => setTimeout(r, 1000));

  const targetElementId = initialElements[0]?.id || 'element-1';
  console.log('Target element for locking test:', targetElementId);

  // Client 1 Locks Object
  console.log('--> Client 1 locking element:', targetElementId);
  ws1.send(JSON.stringify({
    type: 'OBJECT_LOCK',
    elementId: targetElementId
  }));

  await new Promise(r => setTimeout(r, 500));

  // Client 1 Moves Object
  console.log('--> Client 1 moving element:', targetElementId);
  ws1.send(JSON.stringify({
    type: 'OBJECT_MOVE',
    elementId: targetElementId,
    x: 0.60,
    y: 0.70
  }));

  await new Promise(r => setTimeout(r, 500));

  // Client 1 Releases Object
  console.log('--> Client 1 releasing element:', targetElementId);
  ws1.send(JSON.stringify({
    type: 'OBJECT_RELEASE',
    elementId: targetElementId,
    finalX: 0.60,
    finalY: 0.70
  }));

  await new Promise(r => setTimeout(r, 1000));

  // Client 2 Moves Cursor (B -> A propagation)
  console.log('--> Client 2 moving cursor...');
  ws2.send(JSON.stringify({
    type: 'CURSOR_MOVE',
    x: 0.88,
    y: 0.12
  }));

  await new Promise(r => setTimeout(r, 1000));

  // Assertions
  const c2RoomState = c2Messages.some(m => m.type === 'ROOM_STATE');
  const c1UserJoined = c1Messages.some(m => m.type === 'USER_JOINED' && m.displayName === 'Tester Bob');
  const c2LockReceived = c2Messages.some(m => m.type === 'OBJECT_LOCK' && m.elementId === targetElementId);
  const c2MoveReceived = c2Messages.some(m => m.type === 'OBJECT_MOVE' && m.elementId === targetElementId);
  const c2ReleaseReceived = c2Messages.some(m => m.type === 'OBJECT_RELEASE' && m.elementId === targetElementId);
  const c1CursorBReceived = c1Messages.some(m => m.type === 'CURSOR_MOVE' && m.sessionId === 'client-2-sid');

  console.log('\n--- REALTIME VERIFICATION ASSERTIONS ---');
  console.log('Client 2 ROOM_STATE Received:', c2RoomState ? 'PASS' : 'FAIL');
  console.log('Client 1 USER_JOINED Received:', c1UserJoined ? 'PASS' : 'FAIL');
  console.log('Client 2 OBJECT_LOCK Sync Received:', c2LockReceived ? 'PASS' : 'FAIL');
  console.log('Client 2 OBJECT_MOVE Sync Received:', c2MoveReceived ? 'PASS' : 'FAIL');
  console.log('Client 2 OBJECT_RELEASE Sync Received:', c2ReleaseReceived ? 'PASS' : 'FAIL');
  console.log('Client 1 CURSOR_MOVE B->A Sync Received:', c1CursorBReceived ? 'PASS' : 'FAIL');

  ws1.close();
  ws2.close();

  const allPass = c2RoomState && c1UserJoined && c2LockReceived && c2MoveReceived && c2ReleaseReceived && c1CursorBReceived;
  console.log('\n=== REALTIME SUITE STATUS:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED', '===');
}

runProductionVerification().catch(err => {
  console.error('PROD VERIFICATION ERROR:', err);
  process.exit(1);
});
