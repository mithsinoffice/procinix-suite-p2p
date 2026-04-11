import { Checkbox } from '../checkbox';

export function CheckCard({
  title,
  subtitle,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className="px-check-card"
      data-checked={checked}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-mercury-grey)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </label>
  );
}
