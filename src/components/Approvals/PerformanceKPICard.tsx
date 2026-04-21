interface Props {
  label: string;
  value: string;
  subtext?: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
  variant: 'total' | 'on-time' | 'avg-time' | 'rejections' | 'value';
  icon: string;
}

export function PerformanceKPICard({
  label,
  value,
  subtext,
  trend,
  trendDirection = 'up',
  variant,
  icon,
}: Props) {
  const variantClassMap: Record<Props['variant'], string> = {
    total: 'kpi-card-teal',
    'on-time': 'kpi-card-green',
    'avg-time': 'kpi-card-red',
    rejections: 'kpi-card-amber',
    value: 'kpi-card-purple',
  };
  const variantClass = variantClassMap[variant];
  return (
    <div className={`kpi-card ${variantClass}`}>
      <div className={`kpi-card-icon kpi-card-icon-${variant}`}>{icon}</div>
      <p className="kpi-card-label">{label}</p>
      <p className="kpi-card-value">{value}</p>
      {subtext && <p className="kpi-card-subtext">{subtext}</p>}
      {trend && (
        <p className={`kpi-card-trend ${trendDirection === 'up' ? 'kpi-card-trend-up' : 'kpi-card-trend-down'}`}>
          {trendDirection === 'up' ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  );
}
