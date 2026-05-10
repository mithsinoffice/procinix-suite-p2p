import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface MasterPageShellProps {
  masterName: string;
  description?: string;
  children: React.ReactNode;
}

export function MasterPageShell({ masterName, description, children }: MasterPageShellProps) {
  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <Link
          to="/masters"
          style={{
            fontSize: 13,
            color: 'var(--color-teal)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Masters
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--color-mercury-grey)' }} />
        <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 600 }}>
          {masterName}
        </span>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
          {masterName}
        </h1>
        {description && (
          <p style={{ fontSize: 14, color: 'var(--color-mercury-grey)', margin: '4px 0 0 0' }}>
            {description}
          </p>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
