import { X, Printer } from 'lucide-react';

interface LineItem {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  rate: number;
  total: number;
}

interface POPreviewProps {
  onClose: () => void;
  lineItems: LineItem[];
  subtotal: number;
  totalTax: number;
  totalPOValue: number;
}

export function POPreview({
  onClose,
  lineItems,
  subtotal,
  totalTax,
  totalPOValue,
}: POPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8" onClick={onClose}>
        <div
          className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ border: '1px solid var(--color-silver)' }}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between p-6 sticky top-0 bg-white z-10"
            style={{ borderBottom: '1px solid var(--color-silver)' }}
          >
            <h2 className="text-2xl" style={{ color: 'var(--color-ink)' }}>
              Purchase Order Preview
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                  backgroundColor: 'white',
                }}
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-mercury-grey)')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PO Document */}
          <div className="p-8" id="po-document">
            {/* Company Header */}
            <div
              className="mb-8 text-center"
              style={{ borderBottom: '2px solid var(--color-teal)', paddingBottom: '1rem' }}
            >
              <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
                PURCHASE ORDER
              </h1>
              <p style={{ color: 'var(--color-mercury-grey)' }}>Procinix Solutions Pvt Ltd</p>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Mumbai, Maharashtra | GSTIN: 27AABCP1234M1Z5
              </p>
            </div>

            {/* PO Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="mb-3" style={{ color: 'var(--color-ink)' }}>
                  Vendor Details:
                </h3>
                <div className="text-sm space-y-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>Vendor:</strong> Acme Supplies Ltd
                  </p>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>State:</strong> Maharashtra
                  </p>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>GSTIN:</strong> 27AABCA1234M1Z5
                  </p>
                </div>
              </div>
              <div>
                <h3 className="mb-3" style={{ color: 'var(--color-ink)' }}>
                  Order Details:
                </h3>
                <div className="text-sm space-y-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>PO Number:</strong>{' '}
                    PO-IND-2025-00001
                  </p>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>PO Date:</strong>{' '}
                    {new Date().toLocaleDateString('en-IN')}
                  </p>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>Payment Terms:</strong> Net 30
                  </p>
                  <p>
                    <strong style={{ color: 'var(--color-ink)' }}>PO Type:</strong> Catalogue PO
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="mb-4" style={{ color: 'var(--color-ink)' }}>
                Line Items:
              </h3>
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      borderBottom: '2px solid var(--color-silver)',
                    }}
                  >
                    <th
                      className="text-left px-4 py-3 text-sm"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      Sr.
                    </th>
                    <th
                      className="text-left px-4 py-3 text-sm"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      SKU
                    </th>
                    <th
                      className="text-left px-4 py-3 text-sm"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      Product Name
                    </th>
                    <th
                      className="text-right px-4 py-3 text-sm"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      Qty
                    </th>
                    <th
                      className="text-right px-4 py-3 text-sm"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      Rate
                    </th>
                    <th
                      className="text-right px-4 py-3 text-sm"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8"
                        style={{ color: 'var(--color-mercury-grey)' }}
                      >
                        No items added
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                        <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                          {index + 1}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-mercury-grey)' }}>
                          {item.sku}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-ink)' }}>
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                          {item.qty}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                          ₹{item.rate.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--color-ink)' }}>
                          ₹{item.total.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-1/2">
                <div
                  className="flex justify-between py-2"
                  style={{ borderBottom: '1px solid var(--color-silver)' }}
                >
                  <span style={{ color: 'var(--color-mercury-grey)' }}>Subtotal (Excl. Tax):</span>
                  <span style={{ color: 'var(--color-ink)' }}>
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div
                  className="flex justify-between py-2"
                  style={{ borderBottom: '1px solid var(--color-silver)' }}
                >
                  <span style={{ color: 'var(--color-mercury-grey)' }}>GST @ 18%:</span>
                  <span style={{ color: 'var(--color-ink)' }}>
                    ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div
                  className="flex justify-between py-3"
                  style={{
                    backgroundColor: '#E3F2FD',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginTop: '0.5rem',
                  }}
                >
                  <span style={{ color: 'var(--color-ink)' }}>Total PO Value:</span>
                  <span style={{ color: 'var(--color-teal)' }} className="text-xl">
                    ₹{totalPOValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-6">
              <h3 className="mb-3" style={{ color: 'var(--color-ink)' }}>
                General Terms and Conditions:
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Standard warranty terms apply. Governing law: India. Force Majeure applies.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="mb-3" style={{ color: 'var(--color-ink)' }}>
                Delivery Terms and Conditions:
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Delivery must be accompanied by a commercial invoice and quality certificate. Goods
                are subject to inspection upon receipt.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="mb-3" style={{ color: 'var(--color-ink)' }}>
                Payment Milestones:
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                Payment schedule: Remaining balance upon receipt and acceptance of goods.
              </p>
            </div>

            {/* Signature */}
            <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--color-silver)' }}>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p style={{ color: 'var(--color-mercury-grey)' }}>Authorized Signatory</p>
                  <p className="text-sm mt-8" style={{ color: 'var(--color-mercury-grey)' }}>
                    ___________________________
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Procinix Solutions Pvt Ltd
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--color-mercury-grey)' }}>Vendor Acceptance</p>
                  <p className="text-sm mt-8" style={{ color: 'var(--color-mercury-grey)' }}>
                    ___________________________
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Acme Supplies Ltd
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #po-document, #po-document * {
            visibility: visible;
          }
          #po-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
