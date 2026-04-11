import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ShoppingCart,
  Upload,
  DollarSign,
  FileMinus,
  Wallet,
} from 'lucide-react';

/**
 * QUICK CREATE PAGE - SUBKO COFFEE
 * 
 * Simple card-based quick actions for creating transactions
 * No AI, no task lists, no approvals, no analytics
 */

interface QuickAction {
  label: string;
  description: string;
  route: string;
  icon: any;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'Create PR',
    description: 'Start a new purchase requisition',
    route: '/procurement/pr/create',
    icon: FileText,
    color: 'var(--color-teal)',
  },
  {
    label: 'Create PO',
    description: 'Create a purchase order',
    route: '/purchase-orders/create',
    icon: ShoppingCart,
    color: 'var(--color-teal)',
  },
  {
    label: 'Upload Invoice',
    description: 'Upload and process an invoice',
    route: '/invoices/ai-capture',
    icon: Upload,
    color: 'var(--color-teal)',
  },
  {
    label: 'Create Vendor Advance',
    description: 'Request a vendor advance payment',
    route: '/ap/advance-request-form',
    icon: DollarSign,
    color: 'var(--color-teal)',
  },
  {
    label: 'Create Debit Note',
    description: 'Create a new debit note',
    route: '/ap/debit-notes',
    icon: FileMinus,
    color: 'var(--color-teal)',
  },
  {
    label: 'Create Payment',
    description: 'Initiate a payment run',
    route: '/ap/payment-proposal',
    icon: Wallet,
    color: 'var(--color-teal)',
  },
];

export function QuickCreate() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700', marginBottom: '8px' }}>
          Quick Create
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          Create new transactions and records
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div 
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          maxWidth: '1200px'
        }}
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.route}
              onClick={() => navigate(action.route)}
              className="text-left p-5 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-silver)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-teal)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 169, 183, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-silver)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${action.color}15`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: action.color, strokeWidth: 2 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {action.label}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}