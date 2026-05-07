import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * MASTER DATA COMPLIANCE BADGE
 *
 * Visual indicator showing whether a screen is using master-linked components.
 * Used for governance visibility and audit purposes.
 *
 * Usage: Add to top-right of screens during transition period
 */

interface MasterDataComplianceBadgeProps {
  status: 'compliant' | 'partial' | 'non-compliant';
  linkedMasters?: string[];
  showDetails?: boolean;
}

export function MasterDataComplianceBadge({
  status,
  linkedMasters = [],
  showDetails = false,
}: MasterDataComplianceBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'compliant':
        return {
          bg: '#DCFCE7',
          border: '#16A34A',
          text: '#166534',
          icon: CheckCircle,
          label: 'Master Compliant',
        };
      case 'partial':
        return {
          bg: '#FEF3C7',
          border: '#D97706',
          text: '#92400E',
          icon: Shield,
          label: 'Partial Compliance',
        };
      case 'non-compliant':
        return {
          bg: 'var(--color-error-light)',
          border: 'var(--color-error-dark)',
          text: '#991B1B',
          icon: AlertCircle,
          label: 'Needs Update',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!showDetails) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
        style={{
          backgroundColor: config.bg,
          border: `1px solid ${config.border}`,
          color: config.text,
        }}
        title={
          linkedMasters.length > 0 ? `Linked to: ${linkedMasters.join(', ')}` : 'No master linkage'
        }
      >
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-lg text-xs"
      style={{
        backgroundColor: config.bg,
        border: `2px solid ${config.border}`,
        color: config.text,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="font-semibold">{config.label}</span>
      </div>

      {linkedMasters.length > 0 && (
        <div className="mt-2">
          <div className="font-semibold mb-1">Linked Masters:</div>
          <ul className="list-disc list-inside space-y-1">
            {linkedMasters.map((master) => (
              <li key={master}>{master}</li>
            ))}
          </ul>
        </div>
      )}

      {status === 'non-compliant' && (
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
          <div className="font-semibold">Action Required:</div>
          <div>Update this screen to use shared master selectors</div>
        </div>
      )}

      {status === 'partial' && (
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
          <div className="font-semibold">Improvement Needed:</div>
          <div>Some fields still use local data. Migrate to master selectors.</div>
        </div>
      )}
    </div>
  );
}

/**
 * USAGE EXAMPLES:
 *
 * // Compliant screen
 * <MasterDataComplianceBadge
 *   status="compliant"
 *   linkedMasters={['Vendor Master', 'Item Master', 'Tax Master']}
 * />
 *
 * // Partial compliance
 * <MasterDataComplianceBadge
 *   status="partial"
 *   linkedMasters={['Vendor Master']}
 *   showDetails
 * />
 *
 * // Non-compliant (needs update)
 * <MasterDataComplianceBadge
 *   status="non-compliant"
 * />
 */
