import type { ModuleCounts } from '../../types/approvals';

interface Props {
  counts: ModuleCounts;
  activeTab: string;
  onChange: (tab: string) => void;
}

const tabs = [
  { key: 'all', label: 'All', countKey: 'all' },
  { key: 'ap_invoice', label: 'AP Invoices', countKey: 'ap_invoice' },
  { key: 'purchase_order', label: 'Purchase Orders', countKey: 'purchase_order' },
  { key: 'payment', label: 'Payments', countKey: 'payment' },
  { key: 'master_update', label: 'Master Updates', countKey: 'master_update' },
  { key: 'vendor_onboarding', label: 'Vendor Onboarding', countKey: 'vendor_onboarding' },
  { key: 'vendor_advance', label: 'Vendor Advance', countKey: 'vendor_advance' },
] as const;

export function ApprovalTabs({ counts, activeTab, onChange }: Props) {
  return (
    <div className="approval-tabs-wrap">
      {tabs.map((tab) => {
        const count = counts[tab.countKey];
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`approval-tab ${active ? 'approval-tab-active' : 'approval-tab-inactive'}`}
          >
            <span>{tab.label}</span>
            <span
              className={`approval-tab-count ${active ? 'approval-tab-count-active' : 'approval-tab-count-inactive'}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
