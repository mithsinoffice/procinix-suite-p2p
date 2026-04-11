export function CharCounter({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <p
      className="text-xs text-right"
      style={{ color: over ? 'var(--color-error)' : 'var(--color-slate)' }}
    >
      {current}/{max}
    </p>
  );
}
