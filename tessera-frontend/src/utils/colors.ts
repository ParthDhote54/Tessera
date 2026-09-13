// ── Participant color palette ──────────────────────────────────────────────────

export const PARTICIPANT_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#0EA5E9', // Sky
  '#F43F5E', // Rose
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
] as const;

export function pickColor(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return PARTICIPANT_COLORS[hash % PARTICIPANT_COLORS.length];
}
