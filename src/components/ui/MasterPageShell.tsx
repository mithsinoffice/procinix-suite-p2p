import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { listingHeader, listingTitle, listingSubtitle, listingPage } from './listingStyles';

interface MasterPageShellProps {
  masterName: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Option B compact page shell — used by every master listing screen and
 * shared via SimpleMasterScreen. The header (title 15px/500, subtitle 11px
 * muted, padding 14px 20px) is the visual anchor; the breadcrumb sits inside
 * the header at the top so it doesn't add a second band.
 */
export function MasterPageShell({ masterName, description, children }: MasterPageShellProps) {
  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Link
              to="/masters"
              style={{
                fontSize: 11,
                color: 'var(--color-teal)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Masters
            </Link>
            <ChevronRight size={11} style={{ color: 'var(--color-mercury-grey)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-mercury-grey)' }}>{masterName}</span>
          </div>
          <h1 style={listingTitle}>{masterName}</h1>
          {description && <p style={listingSubtitle}>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
