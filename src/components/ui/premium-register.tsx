import { useState, type ReactNode } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

export function toggleMultiSelect(current: string[], value: string) {
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
}

export function PremiumFilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full justify-between"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-fog)',
          color: 'var(--color-ink)',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 shrink-0" style={{ color: 'var(--color-teal)' }} />
          <span className="truncate">{label}</span>
          {selected.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs shrink-0"
              style={{ backgroundColor: '#E7FBFD', color: '#00808C', fontWeight: 700 }}
            >
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--color-mercury-grey)' }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-64 rounded-2xl p-3 z-20"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-fog)',
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.12)',
          }}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.length === 0 ? (
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                No filters selected
              </span>
            ) : (
              selected.map((value) => (
                <span
                  key={value}
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#ECFEFF', color: '#0F766E', fontWeight: 700 }}
                >
                  {value}
                </span>
              ))
            )}
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: isSelected ? '#E7FBFD' : '#FFFFFF',
                    color: 'var(--color-ink)',
                    border: `1px solid ${isSelected ? '#7ADBE3' : 'transparent'}`,
                  }}
                >
                  <span>{option}</span>
                  {isSelected && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px]"
                      style={{
                        backgroundColor: 'var(--color-teal)',
                        color: '#FFFFFF',
                        fontWeight: 700,
                      }}
                    >
                      On
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #EDF3F7' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--color-ink)', color: '#FFFFFF', fontWeight: 600 }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PremiumActionButton({
  label,
  icon,
  onClick,
  tone = 'teal',
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  tone?: 'teal' | 'violet' | 'blue' | 'amber' | 'slate';
}) {
  const tones = {
    teal: {
      background: 'linear-gradient(180deg, #ECFEFF 0%, #DFF8FB 100%)',
      border: '#BEEBF0',
      color: '#0F8A95',
    },
    violet: {
      background: 'linear-gradient(180deg, #F4F1FF 0%, #E9E3FF 100%)',
      border: '#D9CDFF',
      color: '#6D4DE5',
    },
    blue: {
      background: 'linear-gradient(180deg, #EEF7FF 0%, #E2F0FF 100%)',
      border: '#CFE1F8',
      color: '#2F6DB0',
    },
    amber: {
      background: 'linear-gradient(180deg, #FFF8E7 0%, #FFF0C9 100%)',
      border: '#F4D36F',
      color: '#A36A00',
    },
    slate: {
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 100%)',
      border: '#D8E0F0',
      color: '#516173',
    },
  };

  const style = tones[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-xl transition-transform"
      style={{
        width: '32px',
        height: '32px',
        background: style.background,
        border: `1px solid ${style.border}`,
        color: style.color,
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {icon}
    </button>
  );
}
