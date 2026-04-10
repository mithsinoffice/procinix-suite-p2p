import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Edit, FileText, Calendar, Building2, Hash, 
  DollarSign, CheckCircle, Package, Receipt, Eye
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';

interface AccountingEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export function DebitNoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getDebitNoteById } = useAPData();
  const [showAccountingPreview, setShowAccountingPreview] = useState(false);

  const debitNote = getDebitNoteById(id || '') ?? {
    id: id || 'DN-001',
    debitNoteNumber: 'DN-2024-001',
    debitNoteDate: '2024-12-15',
    vendorId: 'VEN-SUBKO-001',
    vendorName: 'ABC Coffee Suppliers',
    vendorCode: 'VEN-2001',
    vendorAPAccount: '2100-001',
    referenceType: 'Invoice',
    referenceNumber: 'INV-2024-001',
    referenceId: 'INV-001',
    reasonId: 'DNR-001',
    reasonName: 'Short Supply',
    debitAmount: 15000,
    currency: 'INR',
    status: 'Issued' as const,
    lineItems: [
      {
        id: 'line-1',
        itemCode: 'ITEM-1001',
        itemName: 'Arabica Coffee Beans - Premium Grade',
        referenceQty: 100,
        invoicedQty: 100,
        debitQty: 10,
        uom: 'KG',
        rate: 1200,
        debitAmount: 12000,
        expenseGL: '5100-001' // Coffee Materials Expense
      },
      {
        id: 'line-2',
        itemCode: 'ITEM-1002',
        itemName: 'Robusta Coffee Beans - Grade A',
        referenceQty: 50,
        invoicedQty: 50,
        debitQty: 5,
        uom: 'KG',
        rate: 600,
        debitAmount: 3000,
        expenseGL: '5100-002' // Coffee Materials Expense
      }
    ],
    createdBy: 'Priya Sharma',
    createdDate: '2024-12-15T09:30:00',
    issuedBy: 'Rajesh Kumar',
    issuedDate: '2024-12-15T10:45:00'
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Draft':
        return { color: '#6E7A82', bgColor: '#F6F9FC' };
      case 'Issued':
        return { color: '#00A9B7', bgColor: '#E8F7F8' };
      case 'Adjusted':
        return { color: '#F59E0B', bgColor: '#FEF3C7' };
      case 'Closed':
        return { color: '#10B981', bgColor: '#D1FAE5' };
      default:
        return { color: '#6E7A82', bgColor: '#F6F9FC' };
    }
  };

  // Generate accounting entries for preview
  const generateAccountingEntries = (): AccountingEntry[] => {
    const entries: AccountingEntry[] = [];

    // Debit: Vendor Control Account (reduces liability)
    entries.push({
      accountCode: debitNote.vendorAPAccount,
      accountName: 'Accounts Payable - ' + debitNote.vendorName,
      debit: debitNote.debitAmount,
      credit: 0
    });

    // Credit: Item Expense/Inventory GL (reverses expense/inventory)
    // Group by GL account
    const glMap = new Map<string, { accountCode: string; amount: number }>();
    
    debitNote.lineItems.forEach(item => {
      const glAccount = item.expenseGL || '5100-000'; // Default expense account
      const existing = glMap.get(glAccount);
      if (existing) {
        existing.amount += item.debitAmount;
      } else {
        glMap.set(glAccount, {
          accountCode: glAccount,
          amount: item.debitAmount
        });
      }
    });

    glMap.forEach((value, key) => {
      entries.push({
        accountCode: value.accountCode,
        accountName: `Expense Account ${value.accountCode}`,
        debit: 0,
        credit: value.amount
      });
    });

    return entries;
  };

  const accountingEntries = generateAccountingEntries();

  const handleBack = () => {
    navigate('/ap/debit-notes');
  };

  const handleEdit = () => {
    navigate(`/ap/debit-notes/edit/${id}`);
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#6E7A82' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E1E6EA'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl" style={{ color: '#0A0F14' }}>
                {debitNote.debitNoteNumber}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: getStatusConfig(debitNote.status).bgColor,
                  color: getStatusConfig(debitNote.status).color
                }}
              >
                {debitNote.status}
              </span>
            </div>
            <p style={{ color: '#6E7A82' }}>
              Debit note against {debitNote.referenceType} {debitNote.referenceNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {debitNote.status === 'Draft' && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid #00A9B7', color: '#00A9B7', backgroundColor: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F7F8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          <button
            onClick={() => setShowAccountingPreview(!showAccountingPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              border: '1px solid #E1E6EA', 
              color: showAccountingPreview ? '#00A9B7' : '#0A0F14',
              backgroundColor: showAccountingPreview ? '#E8F7F8' : 'white'
            }}
          >
            <Eye className="w-4 h-4" />
            {showAccountingPreview ? 'Hide' : 'Preview'} Accounting Entry
          </button>
        </div>
      </div>

      {/* Accounting Preview (Collapsible) */}
      {showAccountingPreview && (
        <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="w-5 h-5" style={{ color: '#00A9B7' }} />
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Accounting Entry Preview</h2>
            <span 
              className="px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
            >
              Read-Only
            </span>
          </div>
          
          <p className="text-sm mb-4" style={{ color: '#6E7A82' }}>
            This is a preview of the accounting entry that will be generated when this debit note is posted.
            GL mappings are derived from Vendor and Item masters.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F6F9FC' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm" style={{ color: '#6E7A82' }}>
                    Account Code
                  </th>
                  <th className="px-4 py-3 text-left text-sm" style={{ color: '#6E7A82' }}>
                    Account Name
                  </th>
                  <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                    Debit
                  </th>
                  <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {accountingEntries.map((entry, index) => (
                  <tr key={index} style={{ borderTop: '1px solid #E1E6EA' }}>
                    <td className="px-4 py-3" style={{ color: '#0A0F14' }}>
                      {entry.accountCode}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6E7A82' }}>
                      {entry.accountName}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: entry.debit > 0 ? '#0A0F14' : '#6E7A82' }}>
                      {entry.debit > 0 ? `${debitNote.currency} ${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: entry.credit > 0 ? '#0A0F14' : '#6E7A82' }}>
                      {entry.credit > 0 ? `${debitNote.currency} ${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                ))}
                {/* Totals */}
                <tr style={{ borderTop: '2px solid #E1E6EA' }}>
                  <td className="px-4 py-3" colSpan={2} style={{ color: '#0A0F14' }}>
                    <strong>Total</strong>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#0A0F14' }}>
                    <strong>
                      {debitNote.currency} {debitNote.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#0A0F14' }}>
                    <strong>
                      {debitNote.currency} {debitNote.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
            <p className="text-sm" style={{ color: '#6E7A82' }}>
              <strong>Note:</strong> This entry will only be posted to the ERP system after approval and payment adjustment.
              GL accounts cannot be modified at the debit note level.
            </p>
          </div>
        </div>
      )}

      {/* Debit Note Details Card */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <h2 className="text-xl mb-6" style={{ color: '#0A0F14' }}>Debit Note Details</h2>
        
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4" style={{ color: '#6E7A82' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Debit Note Number</span>
            </div>
            <p style={{ color: '#0A0F14' }}>{debitNote.debitNoteNumber}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" style={{ color: '#6E7A82' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Debit Note Date</span>
            </div>
            <p style={{ color: '#0A0F14' }}>
              {new Date(debitNote.debitNoteDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: '#6E7A82' }} />
              <span className="text-sm" style={{ color: '#6E7A82' }}>Reference</span>
            </div>
            <p style={{ color: '#0A0F14' }}>
              {debitNote.referenceType}: {debitNote.referenceNumber}
            </p>
          </div>
        </div>

        {/* Vendor Information */}
        <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#F6F9FC' }}>
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-5 h-5" style={{ color: '#00A9B7' }} />
            <h3 style={{ color: '#0A0F14' }}>Vendor Information</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm" style={{ color: '#6E7A82' }}>Vendor Code</span>
              <p style={{ color: '#0A0F14' }}>{debitNote.vendorCode}</p>
            </div>
            <div className="col-span-2">
              <span className="text-sm" style={{ color: '#6E7A82' }}>Vendor Name</span>
              <p style={{ color: '#0A0F14' }}>{debitNote.vendorName}</p>
            </div>
          </div>
        </div>

        {/* Debit Note Reason */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" style={{ color: '#6E7A82' }} />
            <span className="text-sm" style={{ color: '#6E7A82' }}>Debit Note Reason</span>
          </div>
          <p style={{ color: '#0A0F14' }}>{debitNote.reasonName}</p>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Line Items</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm" style={{ color: '#6E7A82' }}>
                  Item / Service
                </th>
                <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                  Reference Qty
                </th>
                <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                  Invoiced Qty
                </th>
                <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                  Debit Qty
                </th>
                <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-sm" style={{ color: '#6E7A82' }}>
                  Debit Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {debitNote.lineItems.map((item, index) => (
                <tr key={item.id} style={{ borderTop: '1px solid #E1E6EA' }}>
                  <td className="px-4 py-3">
                    <div>
                      <div style={{ color: '#0A0F14' }}>{item.itemName}</div>
                      <div className="text-sm" style={{ color: '#6E7A82' }}>{item.itemCode}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#6E7A82' }}>
                    {item.referenceQty} {item.uom}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#0A0F14' }}>
                    {item.invoicedQty} {item.uom}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#00A9B7' }}>
                    <strong>{item.debitQty} {item.uom}</strong>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#0A0F14' }}>
                    {debitNote.currency} {item.rate.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: '#0A0F14' }}>
                    {debitNote.currency} {item.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid #E1E6EA' }}>
          <div className="flex justify-end">
            <div className="w-96 space-y-3">
              <div className="flex justify-between items-center">
                <span style={{ color: '#6E7A82' }}>Subtotal</span>
                <span style={{ color: '#0A0F14' }}>
                  {debitNote.currency} {debitNote.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E1E6EA' }}>
                <span style={{ color: '#0A0F14' }}><strong>Debit Note Total</strong></span>
                <span className="text-xl" style={{ color: '#0A0F14' }}>
                  <strong>{debitNote.currency} {debitNote.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
        <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Audit Trail</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <FileText className="w-4 h-4" style={{ color: '#6E7A82' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: '#0A0F14' }}>Created by {debitNote.createdBy}</span>
                <span className="text-sm" style={{ color: '#6E7A82' }}>{debitNote.createdDate}</span>
              </div>
              <p className="text-sm" style={{ color: '#6E7A82' }}>
                Debit note created against {debitNote.referenceType} {debitNote.referenceNumber}
              </p>
            </div>
          </div>

          {debitNote.status !== 'Draft' && debitNote.issuedBy && (
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E8F7F8' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#00A9B7' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: '#0A0F14' }}>Issued by {debitNote.issuedBy}</span>
                  <span className="text-sm" style={{ color: '#6E7A82' }}>{debitNote.issuedDate}</span>
                </div>
                <p className="text-sm" style={{ color: '#6E7A82' }}>
                  Debit note issued and sent to vendor
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
