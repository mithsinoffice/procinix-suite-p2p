import { Shield, Lock, AlertTriangle, Info, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function POInvoiceValidationDemo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cloud)' }}>
      {/* Header */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '2px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              PO Invoice Smart Validations
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Enterprise-grade 3-way match control, audit compliance, and exception management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/po-invoice-policy-config')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                border: '1px solid var(--color-silver)',
                color: 'var(--color-ink)',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Shield className="w-4 h-4" />
              Policy Configuration
            </button>
            <button
              onClick={() => navigate('/invoices/create')}
              className="px-4 py-2 rounded-lg transition-all"
              style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF', fontWeight: '600' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
            >
              Try Live Demo
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Overview */}
        <div
          className="bg-white rounded-xl p-6 mb-6"
          style={{ border: '2px solid var(--color-silver)' }}
        >
          <h2 className="text-xl mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
            Smart Validation Features
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-teal-tint)',
                border: '1px solid var(--color-teal)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <h3 className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Rate Lock Control
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Invoice rates locked to PO rates with visual indicators and helpful tooltips
              </p>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: '#FFF9E6', border: '1px solid #D97706' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" style={{ color: '#D97706' }} />
                <h3 className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Exception Workflow
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Structured exception requests with approval routing to CFO/Finance Manager
              </p>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: '#F3E5F5', border: '1px solid #7B1FA2' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" style={{ color: '#7B1FA2' }} />
                <h3 className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  3-Way Match
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Automated validation of PO → GRN → Invoice with inline error messages
              </p>
            </div>
          </div>
        </div>

        {/* Rate Lock Control */}
        <div
          className="bg-white rounded-xl p-6 mb-6"
          style={{ border: '2px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <Lock className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                Smart Rate Validation
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Unit rates auto-populated from PO and locked by default
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Hard Lock Example */}
            <div className="p-4 rounded-lg" style={{ border: '2px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Hard Lock (Default)
                </h3>
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--color-teal-tint)',
                    color: 'var(--color-teal)',
                    fontWeight: '600',
                  }}
                >
                  RECOMMENDED
                </span>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Unit Rate
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="₹450.00"
                      disabled
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{
                        border: '1px solid var(--color-silver)',
                        backgroundColor: 'var(--color-cloud)',
                        color: 'var(--color-ink)',
                        fontWeight: '600',
                      }}
                    />
                    <Lock
                      className="absolute right-3 top-2.5 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Info className="w-3 h-3" style={{ color: 'var(--color-mercury-grey)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      Rate locked to PO. PO Rate: ₹450.00
                    </p>
                  </div>
                </div>
                <div
                  className="bg-blue-50 p-3 rounded"
                  style={{ border: '1px solid var(--color-teal)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--color-ink)' }}>
                    <strong>Behavior:</strong> Field is read-only. Tooltip explains: "Rate cannot
                    exceed PO rate. To change rate, amend the PO or request an exception."
                  </p>
                </div>
              </div>
            </div>

            {/* Tolerance-Based Override */}
            <div className="p-4 rounded-lg" style={{ border: '2px solid var(--color-silver)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                  Tolerance-Based Override
                </h3>
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#FFF9E6', color: '#D97706', fontWeight: '600' }}
                >
                  REQUIRES APPROVAL
                </span>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Unit Rate
                  </label>
                  <input
                    type="text"
                    value="₹465.00"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      border: '2px solid var(--color-error)',
                      backgroundColor: 'var(--color-error-light)',
                      color: 'var(--color-ink)',
                      fontWeight: '600',
                    }}
                  />
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span style={{ color: 'var(--color-mercury-grey)' }}>PO: ₹450.00</span>
                    <span style={{ color: 'var(--color-error)' }}>+3.3%</span>
                  </div>
                </div>
                <div
                  className="bg-red-50 p-3 rounded"
                  style={{ border: '1px solid var(--color-error)' }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-error)' }}
                    />
                    <p
                      className="text-xs"
                      style={{ color: 'var(--color-error)', fontWeight: '600' }}
                    >
                      Rate exceeds PO rate. Max tolerance: 2% or ₹1,000
                    </p>
                  </div>
                  <button
                    className="w-full px-3 py-1.5 rounded text-xs transition-colors"
                    style={{
                      backgroundColor: 'var(--color-teal)',
                      color: '#FFFFFF',
                      fontWeight: '600',
                    }}
                  >
                    Request Exception Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exception Request Flow */}
        <div
          className="bg-white rounded-xl p-6 mb-6"
          style={{ border: '2px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FFF9E6' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: '#D97706' }} />
            </div>
            <div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                Exception Handling Workflow
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Structured approval process for rate increases beyond PO
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-error-light)' }}
              >
                <AlertTriangle className="w-6 h-6" style={{ color: 'var(--color-error)' }} />
              </div>
              <h4 className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                1. Validation Error
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                System detects rate exceeds PO or tolerance limit
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal-tint)' }}
              >
                <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
              </div>
              <h4 className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                2. Exception Request
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                User submits detailed justification with supporting docs
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: '#FFF9E6' }}
              >
                <Shield className="w-6 h-6" style={{ color: '#D97706' }} />
              </div>
              <h4 className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                3. CFO Review
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Routed to CFO/Finance Manager for approval decision
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: '#DCFCE7' }}
              >
                <CheckCircle className="w-6 h-6" style={{ color: '#16A34A' }} />
              </div>
              <h4 className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                4. Resolution
              </h4>
              <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Approved/rejected with full audit trail logged
              </p>
            </div>
          </div>

          <div
            className="mt-6 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
            }}
          >
            <h4 className="text-sm mb-2" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
              Exception Modal Includes:
            </h4>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              <li>• Rate comparison (PO vs Requested) with variance %</li>
              <li>• Total financial impact calculation</li>
              <li>• Reason selection (Market increase, Quality upgrade, etc.)</li>
              <li>• Detailed explanation text area (minimum 50 chars)</li>
              <li>• Supporting document upload (vendor rate sheet, emails)</li>
              <li>• Approval routing info (CFO, Finance Controller)</li>
            </ul>
          </div>
        </div>

        {/* 3-Way Match Validation */}
        <div
          className="bg-white rounded-xl p-6 mb-6"
          style={{ border: '2px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#F3E5F5' }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: '#7B1FA2' }} />
            </div>
            <div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                3-Way Match Validation Rules
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Automated quantity and amount validation with contextual information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-teal-tint)',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <h4
                  className="text-xs mb-2"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                >
                  RULE 1: QUANTITY
                </h4>
                <p
                  className="text-sm mb-2"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  Invoice Qty ≤ GRN Qty ≤ PO Qty
                </p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  System displays GRN quantity and remaining PO balance below qty field
                </p>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-teal-tint)',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <h4
                  className="text-xs mb-2"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                >
                  RULE 2: LINE AMOUNT
                </h4>
                <p
                  className="text-sm mb-2"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  Line Amount ≤ PO Line + Tolerance
                </p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Calculated amount validated against PO line value with configured tolerance
                </p>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-teal-tint)',
                  border: '1px solid var(--color-teal)',
                }}
              >
                <h4
                  className="text-xs mb-2"
                  style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                >
                  RULE 3: CUMULATIVE
                </h4>
                <p
                  className="text-sm mb-2"
                  style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                >
                  Total Invoiced ≤ PO Value + Tolerance
                </p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Prevents over-invoicing by tracking cumulative amounts against PO
                </p>
              </div>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-cloud)',
                border: '1px solid var(--color-silver)',
              }}
            >
              <h4 className="text-sm mb-3" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Visual & Contextual Cues in Line Item Table:
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5
                    className="text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    DISPLAYED INFORMATION
                  </h5>
                  <ul className="space-y-1 text-sm" style={{ color: 'var(--color-ink)' }}>
                    <li>✓ PO Line Reference Number</li>
                    <li>✓ PO Rate (for comparison)</li>
                    <li>✓ PO Quantity (ordered)</li>
                    <li>✓ GRN Quantity (received)</li>
                    <li>✓ Previously Invoiced Quantity</li>
                    <li>✓ Remaining PO Balance (qty & amount)</li>
                  </ul>
                </div>
                <div>
                  <h5
                    className="text-xs mb-2"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                  >
                    INLINE VALIDATIONS
                  </h5>
                  <ul className="space-y-1 text-sm" style={{ color: 'var(--color-ink)' }}>
                    <li>✓ Red border for validation errors</li>
                    <li>✓ Inline error messages below field</li>
                    <li>✓ Info icons with explanatory tooltips</li>
                    <li>✓ Real-time calculation updates</li>
                    <li>✓ Submit button disabled with errors</li>
                    <li>✓ Error summary at form top</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Configuration */}
        <div
          className="bg-white rounded-xl p-6"
          style={{ border: '2px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
            </div>
            <div>
              <h2 className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
                Policy & Configuration
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Admin controls for validation rules and approval workflows
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm mb-3" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Configurable Settings:
              </h4>
              <div className="space-y-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Toggle: Hard Lock Rate (default ON)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Toggle: Allow Tolerance-Based Override</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Tolerance: Max % increase</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Tolerance: Max amount increase</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Applicability by vendor/item/PO type</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Workflow mapping to approvers</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm mb-3" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                Governance & Audit:
              </h4>
              <div className="space-y-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Block submission with active violations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Log all override attempts in audit trail</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Track exception approval decisions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Maintain full forensic history</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>CFO-friendly reporting dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                  <span>Compliance export capabilities</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
