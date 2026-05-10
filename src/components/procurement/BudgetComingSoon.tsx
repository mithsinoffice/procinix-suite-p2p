import { PieChart } from 'lucide-react';

/**
 * Placeholder shown in the right-rail of every PR form. The real budget
 * controls (allocation lookup, real-time spend check, post-PR balance) are
 * deferred — see CLAUDE.md "Open decisions". Every form imports this so the
 * empty state stays consistent.
 */
export function BudgetComingSoon() {
  return (
    <div
      style={{
        background: 'var(--color-background-secondary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '20px',
        textAlign: 'center',
        marginTop: '16px',
      }}
    >
      <PieChart size={28} aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }} />
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          marginTop: 8,
          color: 'var(--color-text-secondary)',
        }}
      >
        Budget Control
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          marginTop: 4,
        }}
      >
        Coming soon
      </div>
    </div>
  );
}
