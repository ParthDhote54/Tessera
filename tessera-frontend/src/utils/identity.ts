import { Identity } from '../types/room';
import { randomDisplayName } from './names';
import { pickColor } from './colors';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'tessera_session';

/**
 * Load or generate a tab-scoped session identity.
 * Uses sessionStorage so each browser tab gets a fresh identity.
 */
export function getOrCreateIdentity(): Identity {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Identity;
      if (parsed.sessionId && parsed.displayName && parsed.color) {
        return parsed;
      }
    }
  } catch {
    // Corrupt storage — regenerate
  }

  const sessionId = uuidv4();
  const displayName = randomDisplayName();
  const color = pickColor(sessionId);
  const identity: Identity = { sessionId, displayName, color };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
  } catch {
    // Storage unavailable — continue without persisting
  }

  return identity;
}
