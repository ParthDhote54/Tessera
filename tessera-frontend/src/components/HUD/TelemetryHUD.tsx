import { useState } from 'react';
import { ConnectionStatus, TelemetryData } from '../../types/room';

interface TelemetryHUDProps {
  data: TelemetryData;
}

const STATUS_DOT: Record<ConnectionStatus, { color: string; label: string }> = {
  connected:    { color: '#22C55E', label: 'Live' },
  connecting:   { color: '#F59E0B', label: 'Connecting' },
  reconnecting: { color: '#F59E0B', label: 'Reconnecting' },
  disconnected: { color: '#EF4444', label: 'Offline' },
};

export function TelemetryHUD({ data }: TelemetryHUDProps) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_DOT[data.connectionStatus];
  const rttStr = data.rtt !== null ? `${data.rtt} ms` : '—';
  const rttColor = data.rtt === null ? '#475569'
    : data.rtt < 50 ? '#22C55E'
    : data.rtt < 150 ? '#F59E0B'
    : '#EF4444';

  return (
    <div
      className={`telemetry-hud ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(e => !e)}
      role="button"
      aria-expanded={expanded}
      aria-label="Telemetry panel"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v); }}
    >
      {/* Collapsed bar */}
      <div className="telemetry-bar">
        <span className="telemetry-dot" style={{ backgroundColor: status.color }} />
        <span className="telemetry-label">{status.label}</span>
        {data.rtt !== null && (
          <>
            <span className="telemetry-sep">·</span>
            <span className="telemetry-rtt" style={{ color: rttColor }}>{rttStr}</span>
          </>
        )}
        <span className="telemetry-sep">·</span>
        <span className="telemetry-count">
          {data.participantCount} {data.participantCount === 1 ? 'collaborator' : 'collaborators'}
        </span>
        <span className="telemetry-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="telemetry-expanded">
          <TelRow label="Status" value={status.label} valueColor={status.color} />
          <TelRow label="RTT" value={rttStr} valueColor={rttColor} />
          <TelRow label="Participants" value={String(data.participantCount)} />
          <TelRow label="Msg/s" value={data.msgPerSec > 0 ? `~${data.msgPerSec}` : '0'} />
        </div>
      )}
    </div>
  );
}

function TelRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="telemetry-row">
      <span className="telemetry-row-label">{label}</span>
      <span className="telemetry-row-value" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
