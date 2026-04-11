/**
 * SCAFFOLD SHOWCASE
 * 
 * Purpose: Visual navigation and demo of all scaffold components
 * This page allows browsing through all scaffold sections
 */

import React, { useState } from 'react';
import { DesignTokens } from './components/foundations/DesignTokens';
import { CFOOverview } from './pages/desks/cfo/CFOOverview';
import { CFOApprovals } from './pages/desks/cfo/CFOApprovals';
import { CFOCashAndPayments } from './pages/desks/cfo/CFOCashAndPayments';
import { CFOReports } from './pages/desks/cfo/CFOReports';
import { APOverview } from './pages/desks/ap/APOverview';
import { APInvoices } from './pages/desks/ap/APInvoices';
import { APVendorAdvances } from './pages/desks/ap/APVendorAdvances';
import { APDebitNotes } from './pages/desks/ap/APDebitNotes';
import { APPayments } from './pages/desks/ap/APPayments';
import { ProcurementOverview } from './pages/desks/procurement/ProcurementOverview';
import { ProcurementIntakePR } from './pages/desks/procurement/ProcurementIntakePR';
import { ProcurementPurchaseOrders } from './pages/desks/procurement/ProcurementPurchaseOrders';
import { ProcurementGRNSRN } from './pages/desks/procurement/ProcurementGRNSRN';
import { ProcurementReports } from './pages/desks/procurement/ProcurementReports';
import { OperationsMyTasks } from './pages/desks/operations/OperationsMyTasks';
import { OperationsMyApprovals } from './pages/desks/operations/OperationsMyApprovals';
import { OperationsTransactionTracking } from './pages/desks/operations/OperationsTransactionTracking';
import { OperationsActivityFeed } from './pages/desks/operations/OperationsActivityFeed';
import { IntakePRModule } from './pages/modules/IntakePRModule';
import { PurchaseOrderModule } from './pages/modules/PurchaseOrderModule';
import { GRNSRNModule } from './pages/modules/GRNSRNModule';
import { InvoicesModule } from './pages/modules/InvoicesModule';
import { VendorAdvancesModule } from './pages/modules/VendorAdvancesModule';
import { DebitNotesModule } from './pages/modules/DebitNotesModule';
import { PaymentsModule } from './pages/modules/PaymentsModule';
import { EntityMasterScaffold } from './pages/masters/EntityMaster';
import { CurrencyMasterScaffold } from './pages/masters/CurrencyMaster';
import { ExchangeRateMasterScaffold } from './pages/masters/ExchangeRateMaster';
import { VendorMasterScaffold } from './pages/masters/VendorMaster';
import { ItemMasterScaffold } from './pages/masters/ItemMaster';
import { GLCOAMasterScaffold } from './pages/masters/GLCOAMaster';
import { CostCenterMasterScaffold } from './pages/masters/CostCenterMaster';
import { ProfitCenterMasterScaffold } from './pages/masters/ProfitCenterMaster';
import { BankMasterScaffold } from './pages/masters/BankMaster';
import { PaymentTermsMasterScaffold } from './pages/masters/PaymentTermsMaster';
import { EntityReports } from './pages/reports/EntityReports';
import { ConsolidatedReports } from './pages/reports/ConsolidatedReports';
import { AuditReports } from './pages/reports/AuditReports';
import ScaffoldIndexPage from './SCAFFOLD_INDEX';

type ScaffoldSection = {
  id: string;
  name: string;
  component: React.ComponentType;
};

const scaffoldSections: Record<string, ScaffoldSection[]> = {
  'Foundations': [
    { id: 'design-tokens', name: 'Design Tokens', component: DesignTokens },
    { id: 'scaffold-index', name: 'Scaffold Index', component: ScaffoldIndexPage }
  ],
  'CFO Desk': [
    { id: 'cfo-overview', name: 'Overview', component: CFOOverview },
    { id: 'cfo-approvals', name: 'Approvals', component: CFOApprovals },
    { id: 'cfo-cash', name: 'Cash and Payments', component: CFOCashAndPayments },
    { id: 'cfo-reports', name: 'Reports', component: CFOReports }
  ],
  'AP Desk': [
    { id: 'ap-overview', name: 'Overview', component: APOverview },
    { id: 'ap-invoices', name: 'Invoices', component: APInvoices },
    { id: 'ap-advances', name: 'Vendor Advances', component: APVendorAdvances },
    { id: 'ap-debit', name: 'Debit Notes', component: APDebitNotes },
    { id: 'ap-payments', name: 'Payments', component: APPayments }
  ],
  'Procurement Desk': [
    { id: 'proc-overview', name: 'Overview', component: ProcurementOverview },
    { id: 'proc-pr', name: 'Intake PR', component: ProcurementIntakePR },
    { id: 'proc-po', name: 'Purchase Orders', component: ProcurementPurchaseOrders },
    { id: 'proc-grn', name: 'GRN / SRN', component: ProcurementGRNSRN },
    { id: 'proc-reports', name: 'Reports', component: ProcurementReports }
  ],
  'Operations Desk': [
    { id: 'ops-tasks', name: 'My Tasks', component: OperationsMyTasks },
    { id: 'ops-approvals', name: 'My Approvals', component: OperationsMyApprovals },
    { id: 'ops-tracking', name: 'Transaction Tracking', component: OperationsTransactionTracking },
    { id: 'ops-activity', name: 'Activity Feed', component: OperationsActivityFeed }
  ],
  'Modules': [
    { id: 'mod-pr', name: 'Intake PR', component: IntakePRModule },
    { id: 'mod-po', name: 'Purchase Order', component: PurchaseOrderModule },
    { id: 'mod-grn', name: 'GRN/SRN', component: GRNSRNModule },
    { id: 'mod-invoice', name: 'Invoices', component: InvoicesModule },
    { id: 'mod-advances', name: 'Vendor Advances', component: VendorAdvancesModule },
    { id: 'mod-debit', name: 'Debit Notes', component: DebitNotesModule },
    { id: 'mod-payments', name: 'Payments', component: PaymentsModule }
  ],
  'Masters': [
    { id: 'mst-entity', name: 'Entity Master', component: EntityMasterScaffold },
    { id: 'mst-currency', name: 'Currency Master', component: CurrencyMasterScaffold },
    { id: 'mst-exchange', name: 'Exchange Rate Master', component: ExchangeRateMasterScaffold },
    { id: 'mst-vendor', name: 'Vendor Master', component: VendorMasterScaffold },
    { id: 'mst-item', name: 'Item Master', component: ItemMasterScaffold },
    { id: 'mst-gl', name: 'GL COA Master', component: GLCOAMasterScaffold },
    { id: 'mst-cost', name: 'Cost Center Master', component: CostCenterMasterScaffold },
    { id: 'mst-profit', name: 'Profit Center Master', component: ProfitCenterMasterScaffold },
    { id: 'mst-bank', name: 'Bank Master', component: BankMasterScaffold },
    { id: 'mst-terms', name: 'Payment Terms Master', component: PaymentTermsMasterScaffold }
  ],
  'Reports': [
    { id: 'rpt-entity', name: 'Entity Reports', component: EntityReports },
    { id: 'rpt-consolidated', name: 'Consolidated Reports', component: ConsolidatedReports },
    { id: 'rpt-audit', name: 'Audit Reports', component: AuditReports }
  ]
};

export default function ScaffoldShowcase() {
  const [selectedSection, setSelectedSection] = useState<string>('scaffold-index');

  const findComponent = (): React.ComponentType | null => {
    for (const category of Object.values(scaffoldSections)) {
      const section = category.find(s => s.id === selectedSection);
      if (section) return section.component;
    }
    return null;
  };

  const SelectedComponent = findComponent();

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-cloud)' }}>
      {/* Navigation Sidebar */}
      <div 
        style={{ 
          width: '280px', 
          backgroundColor: 'var(--color-ink)', 
          overflowY: 'auto',
          borderRight: '1px solid var(--color-silver)'
        }}
      >
        <div style={{ padding: '24px 20px' }}>
          <h2 style={{ fontSize: '18px', color: '#FFFFFF', margin: '0 0 8px 0' }}>
            ERP Scaffold
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Browse all scaffold components
          </p>
        </div>

        {Object.entries(scaffoldSections).map(([category, sections]) => (
          <div key={category} style={{ marginBottom: '16px' }}>
            <div style={{ 
              padding: '8px 20px', 
              backgroundColor: 'rgba(0,169,183,0.1)',
              borderLeft: '3px solid var(--color-teal)'
            }}>
              <h3 style={{ fontSize: '12px', color: 'var(--color-teal)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {category}
              </h3>
            </div>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                style={{
                  width: '100%',
                  padding: '10px 20px 10px 32px',
                  backgroundColor: selectedSection === section.id ? 'rgba(0,169,183,0.15)' : 'transparent',
                  border: 'none',
                  borderLeft: selectedSection === section.id ? '3px solid var(--color-teal)' : '3px solid transparent',
                  color: selectedSection === section.id ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (selectedSection !== section.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSection !== section.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-mercury-grey)';
                  }
                }}
              >
                {section.name}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {SelectedComponent ? <SelectedComponent /> : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)' }}>Select a component to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}