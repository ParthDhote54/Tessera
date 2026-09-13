import { useState } from 'react';
import { ParticipantData, ConnectionStatus } from '../../types/room';

interface CollaborationDockProps {
  participants: Map<string, ParticipantData>;
  ownSessionId: string;
  ownDisplayName: string;
  ownColor: string;
  connectionStatus: ConnectionStatus;
  rtt: number | null;
  msgPerSec: number;
}

export function CollaborationDock({
  participants,
  ownSessionId,
  ownDisplayName,
  ownColor,
  connectionStatus,
  rtt,
  msgPerSec,
}: CollaborationDockProps) {
  const [expanded, setExpanded] = useState(false);

  const participantList = Array.from(participants.values());
  
  // Status color mapping
  const statusColor =
    connectionStatus === 'connected'
      ? '#10B981'
      : connectionStatus === 'reconnecting'
      ? '#F59E0B'
      : '#EF4444';

  const statusLabel =
    connectionStatus === 'connected'
      ? 'Live'
      : connectionStatus === 'reconnecting'
      ? 'Reconnecting'
      : 'Disconnected';

  const maxVisible = 4;
  const visibleParticipants = participantList.slice(0, maxVisible);
  const overflowCount = participantList.length - maxVisible;

  return (
    <div
      className={`collab-dock ${expanded ? 'expanded' : ''}`}
      role="region"
      aria-label="Collaboration and connection status"
    >
      {/* ── Expanded Detail Panel ────────────────────────────────────────── */}
      {expanded && (
        <div className="dock-expanded-panel">
          <div className="dock-panel-section">
            <span className="dock-panel-title">Session Metrics</span>
            <div className="dock-metric-row">
              <span className="dock-metric-label">Status</span>
              <span className="dock-metric-value" style={{ color: statusColor }}>
                <span className="dock-dot-inline" style={{ background: statusColor }} />
                {statusLabel}
              </span>
            </div>
            {rtt !== null && (
              <div className="dock-metric-row">
                <span className="dock-metric-label">Latency (RTT)</span>
                <span className="dock-metric-value mono">
                  {rtt} ms
                </span>
              </div>
            )}
            <div className="dock-metric-row">
              <span className="dock-metric-label">Message Rate</span>
              <span className="dock-metric-value mono">
                {msgPerSec} msg/s
              </span>
            </div>
          </div>

          <div className="dock-panel-section">
            <span className="dock-panel-title">Active Collaborators ({participantList.length})</span>
            <div className="dock-participant-list">
              {participantList.map(p => {
                const isYou = p.sessionId === ownSessionId;
                return (
                  <div key={p.sessionId} className="dock-participant-item">
                    <span
                      className="dock-user-dot"
                      style={{ background: p.color }}
                    />
                    <span className="dock-user-name">
                      {p.displayName} {isYou && <span className="dock-you-tag">(you)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Floating Bar ────────────────────────────────────────────── */}
      <button
        className="dock-bar"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label="Toggle collaboration dock metrics"
      >
        {/* Avatars */}
        <div className="dock-avatars">
          {visibleParticipants.map((p, idx) => {
            const isYou = p.sessionId === ownSessionId;
            const initials = p.displayName
              ? p.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              : '?';
            return (
              <div
                key={p.sessionId}
                className="dock-avatar"
                style={{
                  backgroundColor: p.color,
                  zIndex: visibleParticipants.length - idx,
                }}
                title={`${p.displayName}${isYou ? ' (you)' : ''}`}
              >
                {initials}
                {isYou && <span className="dock-you-badge" />}
              </div>
            );
          })}
          {overflowCount > 0 && (
            <div className="dock-avatar-overflow">
              +{overflowCount}
            </div>
          )}
        </div>

        <div className="dock-divider" />

        {/* Status Dot */}
        <div className="dock-status" title={`Status: ${statusLabel}`}>
          <span
            className="dock-status-dot"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* RTT display (Only rendered when a real measurement exists) */}
        {rtt !== null && (
          <div className="dock-rtt-container">
            <span className="dock-rtt-value">{rtt}</span>
            <span className="dock-rtt-unit">ms</span>
          </div>
        )}

        {/* Expand indicator chevron */}
        <span className="dock-chevron">{expanded ? '▼' : '▲'}</span>
      </button>
    </div>
  );
}
