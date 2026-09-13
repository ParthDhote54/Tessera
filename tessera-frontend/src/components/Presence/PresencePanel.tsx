import { ParticipantData } from '../../types/room';

interface PresencePanelProps {
  participants: Map<string, ParticipantData>;
  ownSessionId: string;
}

export function PresencePanel({ participants, ownSessionId }: PresencePanelProps) {
  const list = Array.from(participants.values());
  const others = list.filter(p => p.sessionId !== ownSessionId);
  const self = list.find(p => p.sessionId === ownSessionId);
  const sorted = self ? [self, ...others] : others;
  const visible = sorted.slice(0, 8);
  const overflow = sorted.length - visible.length;

  return (
    <div className="presence-panel" role="status" aria-label={`${sorted.length} participant${sorted.length !== 1 ? 's' : ''} in room`}>
      <span className="presence-count">{sorted.length}</span>
      <div className="presence-avatars">
        {visible.map((p, i) => (
          <div
            key={p.sessionId}
            className="presence-avatar"
            title={p.sessionId === ownSessionId ? `${p.displayName} (You)` : p.displayName}
            style={{
              backgroundColor: p.color,
              zIndex: visible.length - i,
              marginLeft: i === 0 ? 0 : -8,
            }}
            aria-label={p.displayName}
          >
            {p.displayName.charAt(0).toUpperCase()}
            {p.sessionId === ownSessionId && <span className="you-dot" />}
          </div>
        ))}
        {overflow > 0 && (
          <div className="presence-overflow" style={{ marginLeft: -8 }}>
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
