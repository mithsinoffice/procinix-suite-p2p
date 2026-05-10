import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Building2,
  CreditCard,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Send,
  RotateCcw,
  MessageSquare,
  Shield,
  DollarSign,
  Hash,
  Activity,
  Check,
  X,
  Info,
  Banknote,
} from 'lucide-react';
import type { PaymentBatch } from '../data/paymentBatchData';
import { useAuth } from '../contexts/AuthContext';
import {
  approvePaymentBatchApi,
  executePaymentBatchApi,
  fetchPaymentBatchDetail,
  rejectPaymentBatchApi,
  submitPaymentBatchApi,
} from '../lib/paymentsApi';

export function PaymentApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batch, setBatch] = useState<PaymentBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request-info'>('approve');

  const reload = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;
      if (!user?.tenantId) {
        setLoadError('Session expired. Please log in again.');
        setBatch(null);
        setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchPaymentBatchDetail(user.tenantId, id);
        setBatch(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Payment batch not found');
        setBatch(null);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [id, user?.tenantId]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'USD') {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
      }
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return formatCurrency(amount, currency);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: 'Draft', bg: '#F3F4F6', color: '#6B7280', icon: FileText },
      'pending-approval': {
        label: 'Pending Approval',
        bg: '#FEF3C7',
        color: '#F59E0B',
        icon: Clock,
      },
      approved: { label: 'Approved', bg: '#D1FAE5', color: '#10B981', icon: CheckCircle },
      executed: { label: 'Executed', bg: '#E0F2F1', color: 'var(--color-teal)', icon: CheckCircle },
      failed: { label: 'Failed', bg: 'var(--color-error-light)', color: '#EF4444', icon: XCircle },
      'partially-executed': {
        label: 'Partially Executed',
        bg: '#FEF3C7',
        color: '#F59E0B',
        icon: AlertTriangle,
      },
      rejected: {
        label: 'Rejected',
        bg: 'var(--color-error-light)',
        color: '#EF4444',
        icon: XCircle,
      },
    };

    const { label, bg, color, icon: Icon } = config[status as keyof typeof config] || config.draft;

    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ backgroundColor: bg, border: `1px solid ${color}30` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
        <span style={{ color, fontWeight: '700', fontSize: '13px' }}>{label}</span>
      </div>
    );
  };

  const getActionBadge = (action: string) => {
    const config = {
      approved: { label: 'Approved', color: '#10B981', icon: CheckCircle },
      rejected: { label: 'Rejected', color: '#EF4444', icon: XCircle },
      pending: { label: 'Pending', color: '#F59E0B', icon: Clock },
      'requested-info': { label: 'Info Requested', color: '#3B82F6', icon: Info },
    };

    const { label, color, icon: Icon } = config[action as keyof typeof config] || config.pending;

    return (
      <div className="inline-flex items-center gap-1.5">
        <Icon className="w-4 h-4" style={{ color }} />
        <span style={{ color, fontWeight: '600', fontSize: '13px' }}>{label}</span>
      </div>
    );
  };

  const getExecutionBadge = (status: string) => {
    const config = {
      success: { label: 'Success', bg: '#D1FAE5', color: '#10B981' },
      failed: { label: 'Failed', bg: 'var(--color-error-light)', color: '#EF4444' },
      pending: { label: 'Pending', bg: '#FEF3C7', color: '#F59E0B' },
      processing: { label: 'Processing', bg: '#E0F2F1', color: 'var(--color-teal)' },
    };

    const { label, bg, color } = config[status as keyof typeof config] || config.pending;

    return (
      <span
        className="px-2 py-1 rounded text-xs"
        style={{ backgroundColor: bg, color, fontWeight: '600' }}
      >
        {label}
      </span>
    );
  };

  const handleApprove = () => {
    setActionType('approve');
    setShowCommentModal(true);
  };

  const handleReject = () => {
    setActionType('reject');
    setShowCommentModal(true);
  };

  const handleRequestInfo = () => {
    setActionType('request-info');
    setShowCommentModal(true);
  };

  const handleSubmitDraft = async () => {
    if (!user?.tenantId || !batch) return;
    setActionBusy(true);
    try {
      await submitPaymentBatchApi(user.tenantId, batch.id);
      await reload({ silent: true });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleExecute = async () => {
    if (!user?.tenantId || !batch) return;
    setActionBusy(true);
    try {
      await executePaymentBatchApi(user.tenantId, batch.id);
      await reload({ silent: true });
      window.alert('Payments recorded. Invoice list will show updated payment totals on refresh.');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Execute failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRetry = () => {
    window.alert('Retry is not implemented for this integration.');
  };

  const handleDownloadBankFile = () => {
    window.alert(
      'Bank file export is not wired yet; execution still posts payments to the ledger.'
    );
  };

  const submitAction = async () => {
    if (!batch || !user?.tenantId) {
      setShowCommentModal(false);
      setComment('');
      return;
    }
    if (actionType === 'request-info') {
      setShowCommentModal(false);
      setComment('');
      window.alert('Info request is not persisted in this version.');
      return;
    }
    setActionBusy(true);
    try {
      if (actionType === 'approve') {
        await approvePaymentBatchApi(user.tenantId, batch.id, { comments: comment || undefined });
      } else {
        await rejectPaymentBatchApi(user.tenantId, batch.id, comment || 'Rejected');
      }
      setShowCommentModal(false);
      setComment('');
      await reload({ silent: true });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading && !batch) {
    return (
      <div className="p-10 text-center text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
        Loading payment batch…
      </div>
    );
  }

  if (loadError && !batch) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm mb-4" style={{ color: '#EF4444' }}>
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => navigate('/ap/payment-batches')}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-teal)', color: '#fff' }}
        >
          Back to batches
        </button>
      </div>
    );
  }

  if (!batch) {
    return null;
  }

  // Calculate execution statistics
  const executionStats = batch.executionDetails
    ? {
        total: batch.executionDetails.length,
        success: batch.executionDetails.filter((e) => e.status === 'success').length,
        failed: batch.executionDetails.filter((e) => e.status === 'failed').length,
        pending: batch.executionDetails.filter((e) => e.status === 'pending').length,
      }
    : null;

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid var(--color-silver)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-cloud)',
                border: '1px solid var(--color-silver)',
              }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
            </button>
            <div>
              <h1
                className="text-2xl mb-1"
                style={{ color: 'var(--color-ink)', fontWeight: '700' }}
              >
                Payment Batch: {batch.batchNo}
              </h1>
              <p style={{ color: 'var(--color-mercury-grey)', fontSize: '14px' }}>
                Maker-Checker Approval & Execution
              </p>
            </div>
          </div>
          <div>{getStatusBadge(batch.status)}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {batch.status === 'draft' && user?.tenantId && (
            <button
              type="button"
              onClick={handleSubmitDraft}
              disabled={actionBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--color-teal)',
                color: '#FFFFFF',
                border: 'none',
                opacity: actionBusy ? 0.6 : 1,
              }}
            >
              <Send className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>
                {actionBusy ? 'Working…' : 'Submit for approval'}
              </span>
            </button>
          )}
          {batch.status === 'pending-approval' && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  opacity: actionBusy ? 0.6 : 1,
                }}
              >
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm" style={{ fontWeight: '600' }}>
                  Approve
                </span>
              </button>
              <button
                type="button"
                onClick={handleRequestInfo}
                disabled={actionBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  opacity: actionBusy ? 0.6 : 1,
                }}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm" style={{ fontWeight: '600' }}>
                  Request Info
                </span>
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  opacity: actionBusy ? 0.6 : 1,
                }}
              >
                <XCircle className="w-4 h-4" />
                <span className="text-sm" style={{ fontWeight: '600' }}>
                  Reject
                </span>
              </button>
            </>
          )}

          {batch.status === 'approved' && (
            <>
              {batch.bankFileGenerated && (
                <button
                  type="button"
                  onClick={handleDownloadBankFile}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-mercury-grey)',
                    border: '1px solid var(--color-silver)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm" style={{ fontWeight: '600' }}>
                    Download Bank File
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExecute}
                disabled={actionBusy || !user?.tenantId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-teal)',
                  color: '#FFFFFF',
                  border: 'none',
                  opacity: actionBusy || !user?.tenantId ? 0.6 : 1,
                }}
              >
                <Send className="w-4 h-4" />
                <span className="text-sm" style={{ fontWeight: '600' }}>
                  {actionBusy ? 'Working…' : 'Execute Payment'}
                </span>
              </button>
            </>
          )}

          {batch.status === 'partially-executed' && executionStats && executionStats.failed > 0 && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                border: 'none',
              }}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm" style={{ fontWeight: '600' }}>
                Retry Failed ({executionStats.failed})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Payment Batch Summary */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Hash className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                Payment Batch Summary
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Batch ID */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Batch ID
                  </span>
                </div>
                <div style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                  {batch.batchNo}
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Total Amount
                  </span>
                </div>
                <div style={{ color: 'var(--color-teal)', fontWeight: '700', fontSize: '18px' }}>
                  {formatCompactCurrency(batch.totalAmount, batch.currency)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  {batch.invoiceCount} invoices
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Payment Date
                  </span>
                </div>
                <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                  {new Date(batch.paymentDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                  >
                    Payment Mode
                  </span>
                </div>
                <div
                  className="inline-block px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: '#E0F2F1',
                    color: 'var(--color-teal)',
                    fontWeight: '600',
                  }}
                >
                  {batch.paymentMode}
                </div>
              </div>
            </div>

            {/* Bank Account */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-silver)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                <span
                  className="text-xs"
                  style={{
                    color: 'var(--color-mercury-grey)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                >
                  Payment Account
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Account Name
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {batch.bankAccount.accountName}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Account Number
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {batch.bankAccount.accountNo}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    Bank Name
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {batch.bankAccount.bankName}
                  </div>
                </div>
              </div>
            </div>

            {/* Created By / Approved By */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-silver)' }}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                    <span
                      className="text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                    >
                      Created By
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                    {batch.createdBy}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    {new Date(batch.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {batch.approvedBy && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
                      >
                        Approved By
                      </span>
                    </div>
                    <div style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}>
                      {batch.approvedBy}
                    </div>
                    {batch.approvedAt && (
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        {new Date(batch.approvedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comments */}
            {batch.comments && (
              <div
                className="mt-6 p-4 rounded-lg"
                style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5" style={{ color: '#F59E0B' }} />
                  <div>
                    <div className="text-xs mb-1" style={{ color: '#F59E0B', fontWeight: '700' }}>
                      Batch Notes
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      {batch.comments}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Breakdown */}
          <div
            className="bg-white rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-silver)' }}>
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                  Invoice Breakdown ({batch.invoices.length})
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      borderBottom: '1px solid var(--color-silver)',
                    }}
                  >
                    <th
                      className="text-left px-6 py-3 text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                    >
                      INVOICE NO
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                    >
                      VENDOR
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                    >
                      ACCOUNT DETAILS
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                    >
                      AMOUNT
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                    >
                      DUE DATE
                    </th>
                    <th
                      className="text-left px-6 py-3 text-xs"
                      style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                    >
                      CATEGORY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batch.invoices.map((invoice, index) => (
                    <tr
                      key={invoice.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                        borderBottom: '1px solid var(--color-silver)',
                      }}
                    >
                      <td className="px-6 py-4">
                        <div
                          style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '14px' }}
                        >
                          {invoice.invoiceNo}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div
                          style={{ color: 'var(--color-ink)', fontWeight: '600', fontSize: '13px' }}
                        >
                          {invoice.vendor}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div
                          className="text-xs"
                          style={{ color: 'var(--color-ink)', fontWeight: '500' }}
                        >
                          {invoice.vendorAccount}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {invoice.ifscCode}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div
                          style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '14px' }}
                        >
                          {formatCompactCurrency(invoice.amount, invoice.currency)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                          {new Date(invoice.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor:
                              invoice.category === 'Statutory'
                                ? 'var(--color-error-light)'
                                : 'var(--color-cloud)',
                            color:
                              invoice.category === 'Statutory'
                                ? 'var(--color-error-dark)'
                                : 'var(--color-mercury-grey)',
                            fontWeight: '600',
                          }}
                        >
                          {invoice.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Chain */}
          <div
            className="bg-white rounded-lg p-6"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                Approval Chain
              </h2>
            </div>

            <div className="space-y-4">
              {(batch.approvalChain || []).map((approval, index) => (
                <div
                  key={approval.id}
                  className="flex items-start gap-4 p-4 rounded-lg"
                  style={{
                    backgroundColor:
                      approval.action === 'approved'
                        ? '#F0FDF4'
                        : approval.action === 'rejected'
                          ? '#FEF2F2'
                          : approval.action === 'pending'
                            ? '#FFFBEB'
                            : 'var(--color-cloud)',
                    border: `1px solid ${
                      approval.action === 'approved'
                        ? '#BBF7D0'
                        : approval.action === 'rejected'
                          ? '#FECACA'
                          : approval.action === 'pending'
                            ? '#FDE68A'
                            : 'var(--color-silver)'
                    }`,
                  }}
                >
                  {/* Level Badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        approval.action === 'approved'
                          ? '#10B981'
                          : approval.action === 'rejected'
                            ? '#EF4444'
                            : approval.action === 'pending'
                              ? '#F59E0B'
                              : '#6B7280',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '14px',
                    }}
                  >
                    {approval.level}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div
                          style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '14px' }}
                        >
                          {approval.approverName}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {approval.approverRole}
                        </div>
                      </div>
                      {getActionBadge(approval.action)}
                    </div>

                    {approval.timestamp && (
                      <div className="flex items-center gap-2 mb-2">
                        <Clock
                          className="w-3.5 h-3.5"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {new Date(approval.timestamp).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {approval.comments && (
                      <div
                        className="mt-2 p-3 rounded-lg text-sm"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-silver)',
                          color: 'var(--color-ink)',
                        }}
                      >
                        <MessageSquare
                          className="w-3.5 h-3.5 inline mr-2"
                          style={{ color: 'var(--color-mercury-grey)' }}
                        />
                        {approval.comments}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Status */}
          {(batch.status === 'executed' ||
            batch.status === 'partially-executed' ||
            batch.status === 'failed') && (
            <div
              className="bg-white rounded-lg p-6"
              style={{ border: '1px solid var(--color-silver)' }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                <h2 style={{ color: 'var(--color-ink)', fontWeight: '700', fontSize: '16px' }}>
                  Execution Status
                </h2>
              </div>

              {/* Execution Summary */}
              {executionStats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
                      Total
                    </div>
                    <div
                      className="text-2xl"
                      style={{ color: 'var(--color-ink)', fontWeight: '700' }}
                    >
                      {executionStats.total}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                    <div className="text-xs mb-1" style={{ color: '#059669' }}>
                      Success
                    </div>
                    <div className="text-2xl" style={{ color: '#10B981', fontWeight: '700' }}>
                      {executionStats.success}
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-error-light)' }}
                  >
                    <div className="text-xs mb-1" style={{ color: 'var(--color-error-dark)' }}>
                      Failed
                    </div>
                    <div className="text-2xl" style={{ color: '#EF4444', fontWeight: '700' }}>
                      {executionStats.failed}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                    <div className="text-xs mb-1" style={{ color: '#D97706' }}>
                      Pending
                    </div>
                    <div className="text-2xl" style={{ color: '#F59E0B', fontWeight: '700' }}>
                      {executionStats.pending}
                    </div>
                  </div>
                </div>
              )}

              {/* Bank File Status */}
              <div
                className="mb-6 p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    {batch.bankFileGenerated ? (
                      <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    ) : (
                      <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
                    )}
                    <div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        Bank File
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {batch.bankFileGenerated ? 'Generated' : 'Pending'}
                      </div>
                      {batch.bankFileGeneratedAt && (
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {new Date(batch.bankFileGeneratedAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {batch.sentToBank ? (
                      <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    ) : (
                      <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
                    )}
                    <div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        Sent to Bank
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {batch.sentToBank ? 'Yes' : 'No'}
                      </div>
                      {batch.sentToBankAt && (
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {new Date(batch.sentToBankAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {batch.executedBy ? (
                      <User className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                    ) : (
                      <User className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
                    )}
                    <div>
                      <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        Executed By
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: 'var(--color-ink)', fontWeight: '600' }}
                      >
                        {batch.executedBy || 'N/A'}
                      </div>
                      {batch.executedAt && (
                        <div className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                          {new Date(batch.executedAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {batch.executionDetails && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          borderBottom: '1px solid var(--color-silver)',
                        }}
                      >
                        <th
                          className="text-left px-6 py-3 text-xs"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                        >
                          INVOICE NO
                        </th>
                        <th
                          className="text-left px-4 py-3 text-xs"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                        >
                          VENDOR
                        </th>
                        <th
                          className="text-right px-4 py-3 text-xs"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                        >
                          AMOUNT
                        </th>
                        <th
                          className="text-center px-4 py-3 text-xs"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                        >
                          STATUS
                        </th>
                        <th
                          className="text-left px-4 py-3 text-xs"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                        >
                          UTR / DETAILS
                        </th>
                        <th
                          className="text-left px-6 py-3 text-xs"
                          style={{ color: 'var(--color-mercury-grey)', fontWeight: '700' }}
                        >
                          TIMESTAMP
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.executionDetails.map((execution, index) => (
                        <tr
                          key={execution.id}
                          style={{
                            backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                            borderBottom: '1px solid var(--color-silver)',
                          }}
                        >
                          <td className="px-6 py-4">
                            <div
                              style={{
                                color: 'var(--color-ink)',
                                fontWeight: '600',
                                fontSize: '13px',
                              }}
                            >
                              {execution.invoiceNo}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div style={{ color: 'var(--color-ink)', fontSize: '13px' }}>
                              {execution.vendor}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div
                              style={{
                                color: 'var(--color-ink)',
                                fontWeight: '600',
                                fontSize: '14px',
                              }}
                            >
                              {formatCompactCurrency(execution.amount, batch.currency)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {getExecutionBadge(execution.status)}
                          </td>
                          <td className="px-4 py-4">
                            {execution.utr ? (
                              <div
                                className="text-xs"
                                style={{ color: '#10B981', fontWeight: '600' }}
                              >
                                {execution.utr}
                              </div>
                            ) : execution.failureReason ? (
                              <div className="text-xs" style={{ color: '#EF4444' }}>
                                {execution.failureReason}
                              </div>
                            ) : (
                              <span className="text-xs" style={{ color: '#CBD5E1' }}>
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {execution.executedAt && (
                              <div
                                className="text-xs"
                                style={{ color: 'var(--color-mercury-grey)' }}
                              >
                                {new Date(execution.executedAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCommentModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)', fontWeight: '700' }}>
              {actionType === 'approve'
                ? 'Approve Payment Batch'
                : actionType === 'reject'
                  ? 'Reject Payment Batch'
                  : 'Request Additional Information'}
            </h3>

            <div className="mb-4">
              <label
                className="block text-sm mb-2"
                style={{ color: 'var(--color-mercury-grey)', fontWeight: '600' }}
              >
                Comments {actionType === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comments..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                }}
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowCommentModal(false)}
                className="px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-mercury-grey)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={(actionType === 'reject' && !comment) || actionBusy}
                className="px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor:
                    actionType === 'approve'
                      ? '#10B981'
                      : actionType === 'reject'
                        ? '#EF4444'
                        : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  opacity: actionType === 'reject' && !comment ? 0.5 : 1,
                  cursor: actionType === 'reject' && !comment ? 'not-allowed' : 'pointer',
                }}
              >
                {actionType === 'approve'
                  ? 'Approve Batch'
                  : actionType === 'reject'
                    ? 'Reject Batch'
                    : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
