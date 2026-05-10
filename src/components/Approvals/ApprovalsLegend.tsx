export function ApprovalsLegend() {
  return (
    <div className="legend-wrap">
      <span className="legend-item">
        <span className="legend-dot legend-dot-msme" />
        MSME vendor (45-day rule)
      </span>
      <span className="legend-item">
        <span className="legend-dot legend-dot-urgent" />
        Urgent / SLA breach
      </span>
      <span className="legend-item">
        <span className="legend-dot legend-dot-normal" />
        Normal within SLA
      </span>
    </div>
  );
}
