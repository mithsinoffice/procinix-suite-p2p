import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ShoppingCart,
  ArrowRight,
  Package,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

/**
 * PO CREATION HUB
 *
 * Central entry point for all PO creation workflows:
 * 1. PO WITH PR - Convert approved PRs to POs (with consumption tracking)
 * 2. PO WITHOUT PR - Direct PO creation (ad-hoc procurement)
 *
 * Features:
 * - Mode selection
 * - PR consumption tracking
 * - Full traceability (PR ↔ PO)
 * - Audit trail
 */

type POCreationMode = 'with-pr' | 'without-pr' | null;

export function POCreationHub() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<POCreationMode>(null);

  const handleModeSelection = (mode: POCreationMode) => {
    setSelectedMode(mode);

    if (mode === 'with-pr') {
      // Navigate to PR-to-PO conversion workspace
      navigate('/procurement/pr/to-po-conversion-enhanced');
    } else if (mode === 'without-pr') {
      // Navigate to direct PO creation
      navigate('/purchase-orders/create');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
          Create Purchase Order
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          Choose your preferred PO creation method
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {/* PO WITH PR */}
        <button
          onClick={() => handleModeSelection('with-pr')}
          className="bg-white p-8 rounded-lg text-left transition-all hover:shadow-lg"
          style={{
            border:
              selectedMode === 'with-pr'
                ? '2px solid var(--color-teal)'
                : '1px solid var(--color-silver)',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <ShoppingCart className="w-7 h-7" style={{ color: 'var(--color-teal)' }} />
            </div>
            <ArrowRight className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
          </div>

          <h2 className="text-xl mb-3" style={{ color: 'var(--color-ink)' }}>
            PO with PR
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--color-mercury-grey)', lineHeight: '1.6' }}
          >
            Convert approved Purchase Requisitions into Purchase Orders. Best for planned
            procurement with proper authorization trail.
          </p>

          {/* Key Features */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Full PR-to-PO traceability
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Multi-PR clubbing support
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Automatic PR consumption tracking
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Budget & approval workflow aligned
              </span>
            </div>
          </div>

          {/* Recommended Badge */}
          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
            style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }}
          >
            <Package className="w-3 h-3" />
            Recommended
          </div>
        </button>

        {/* PO WITHOUT PR */}
        <button
          onClick={() => handleModeSelection('without-pr')}
          className="bg-white p-8 rounded-lg text-left transition-all hover:shadow-lg"
          style={{
            border:
              selectedMode === 'without-pr'
                ? '2px solid var(--color-teal)'
                : '1px solid var(--color-silver)',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <FileText className="w-7 h-7" style={{ color: '#D97706' }} />
            </div>
            <ArrowRight className="w-6 h-6" style={{ color: '#D97706' }} />
          </div>

          <h2 className="text-xl mb-3" style={{ color: 'var(--color-ink)' }}>
            PO without PR
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--color-mercury-grey)', lineHeight: '1.6' }}
          >
            Create Purchase Orders directly without a requisition. Suitable for urgent, ad-hoc, or
            emergency procurement needs.
          </p>

          {/* Key Features */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Quick PO creation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Direct vendor selection
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Manual line item entry
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: '#D97706' }} />
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Requires higher approval authority
              </span>
            </div>
          </div>

          {/* Use Case Badge */}
          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
            style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
          >
            For urgent/emergency needs
          </div>
        </button>
      </div>

      {/* Info Section */}
      <div
        className="bg-white p-6 rounded-lg mt-8 max-w-5xl"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-teal-tint)' }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
          </div>
          <div>
            <h3 className="text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
              Which option should I choose?
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--color-teal)' }}>•</span>
                <span>
                  <strong>Choose "PO with PR"</strong> if you have approved requisitions waiting to
                  be converted into purchase orders. This ensures proper budget alignment and
                  approval workflow compliance.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#D97706' }}>•</span>
                <span>
                  <strong>Choose "PO without PR"</strong> for urgent procurement, vendor advances,
                  or situations where creating a PR first would cause delays. Note: This typically
                  requires higher approval authority.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-5xl">
        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
          </div>
          <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
            12
          </p>
          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
            Approved PRs Awaiting Conversion
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-success-light)' }}
            >
              <Package className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
            </div>
          </div>
          <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
            ₹89.5L
          </p>
          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
            Total PR Value Pending PO
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <FileText className="w-5 h-5" style={{ color: '#D97706' }} />
            </div>
          </div>
          <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
            34
          </p>
          <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
            POs Created This Month
          </p>
        </div>
      </div>
    </div>
  );
}
