import { useCallback, useEffect, useRef } from 'react';
import { ClientMessage, ServerMessage } from '../types/events';
import { ConnectionStatus } from '../types/room';

const WS_URL = (import.meta.env.VITE_WS_URL && !import.meta.env.VITE_WS_URL.includes('YOUR_BACKEND_URL'))
  ? import.meta.env.VITE_WS_URL
  : 'wss://tessera-e1w0.onrender.com/ws';

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_ATTEMPTS = 10;
const PING_INTERVAL_MS = 5000;

export interface WebSocketHookOptions {
  onMessage: (msg: ServerMessage) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onRtt: (rtt: number) => void;
  onMessageReceived: () => void; // for message rate counting
}

export interface WebSocketControls {
  send: (msg: ClientMessage) => void;
  disconnect: () => void;
}

/**
 * Manages a WebSocket connection with automatic reconnection,
 * PING/PONG RTT measurement, and message routing.
 */
export function useWebSocket(options: WebSocketHookOptions): WebSocketControls {
  const { onMessage, onStatusChange, onRtt, onMessageReceived } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalCloseRef = useRef(false);
  const statusRef = useRef<ConnectionStatus>('connecting');
  const pingTimestampRef = useRef<number>(0);

  // Refs to keep latest callbacks without triggering reconnects
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const onRttRef = useRef(onRtt);
  const onMessageReceivedRef = useRef(onMessageReceived);
  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;
  onRttRef.current = onRtt;
  onMessageReceivedRef.current = onMessageReceived;

  const setStatus = useCallback((s: ConnectionStatus) => {
    statusRef.current = s;
    onStatusChangeRef.current(s);
  }, []);

  const stopPing = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const startPing = useCallback((ws: WebSocket) => {
    stopPing();
    pingTimerRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        pingTimestampRef.current = Date.now();
        try {
          ws.send(JSON.stringify({ type: 'PING', timestamp: pingTimestampRef.current }));
        } catch { /* ignore */ }
      }
    }, PING_INTERVAL_MS);
  }, [stopPing]);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    intentionalCloseRef.current = false;

    setStatus(attemptsRef.current === 0 ? 'connecting' : 'reconnecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      setStatus('connected');
      startPing(ws);
    };

    ws.onmessage = (event) => {
      onMessageReceivedRef.current();
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (msg.type === 'PONG') {
          const rtt = Date.now() - (msg as { type: 'PONG'; timestamp: number }).timestamp;
          onRttRef.current(Math.max(0, rtt));
          return;
        }
        onMessageRef.current(msg);
      } catch {
        // Malformed server message — ignore
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; handle there
    };

    ws.onclose = () => {
      stopPing();
      wsRef.current = null;
      if (intentionalCloseRef.current) return;
      scheduleReconnect();
    };
  }, [setStatus, startPing, stopPing]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setStatus('disconnected');
      return;
    }
    setStatus('reconnecting');

    const delayBase = RECONNECT_DELAYS[Math.min(attemptsRef.current, RECONNECT_DELAYS.length - 1)];
    const jitter = (Math.random() - 0.5) * 1000;
    const delay = Math.max(500, delayBase + jitter);

    attemptsRef.current++;
    reconnectTimerRef.current = setTimeout(connect, delay);
  }, [connect, setStatus]);

  // Initial connection
  useEffect(() => {
    connect();
    return () => {
      intentionalCloseRef.current = true;
      stopPing();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    stopPing();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    setStatus('disconnected');
  }, [stopPing, setStatus]);

  return { send, disconnect };
}
