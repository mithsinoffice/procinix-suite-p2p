interface Chip {
  label: string;
  count: number;
}

interface Props {
  count: number;
  label: string;
  subtext: string;
  badge: string;
  variant: 'pending' | 'urgent' | 'msme' | 'aging';
  barPercent: number;
  chips?: Chip[];
  onClick?: () => void;
}

export function ActionKPICard(props: Props) {
  const variantClass = `action-kpi-card-${props.variant}`;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`action-kpi-card ${variantClass}`}
    >
      <div className="flex items-start justify-between">
        <p className="action-kpi-count">{props.count}</p>
        <span className="action-kpi-badge">
          {props.badge}
        </span>
      </div>
      <p className="action-kpi-label">{props.label}</p>
      <p className="action-kpi-subtext">{props.subtext}</p>
      {props.chips && props.chips.length > 0 && (
        <div className="action-kpi-chips">
          {props.chips.map((chip) => (
            <span key={chip.label} className="action-kpi-chip">
              {chip.label}: {chip.count}
            </span>
          ))}
        </div>
      )}
      <div className="action-kpi-progress-track">
        <div className="action-kpi-progress-fill" style={{ width: `${Math.min(100, Math.max(0, props.barPercent))}%` }} />
      </div>
    </button>
  );
}
