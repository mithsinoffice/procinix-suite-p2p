import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { mysqlApiRequest } from '../../lib/mysql/client';

interface ExpiringPO {
  id: string;
  poNumber: string;
  vendorName: string;
  expiryDate: string;
  totalValue: number;
}

interface ExpiringStats {
  expiringThisWeek: number;
  expired: number;
  autoClosedThisMonth: number;
  expiringPOs: ExpiringPO[];
}

interface ExpiringPOsWidgetProps {
  onExtend?: (poId: string) => void;
  onClose?: (poId: string) => void;
}

export function ExpiringPOsWidget({ onExtend, onClose }: ExpiringPOsWidgetProps) {
  const [data, setData] = useState<ExpiringStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mysqlApiRequest<ExpiringStats>('/api/purchase-orders/expiring')
      .then(setData)
      .catch(() => {/* silently fail for widget */})
      .finally(() => setLoading(false));
  }, []);

  const statCards: Array<{ label: string; value: number; color: string; icon: React.ReactNode }> = [
    {
      label: 'Expiring This Week',
      value: data?.expiringThisWeek ?? 0,
      color: 'var(--color-warning)',
      icon: <Clock size={20} style={{ color: 'var(--color-warning-dark)' }} />,
    },
    {
      label: 'Expired',
      value: data?.expired ?? 0,
      color: 'var(--color-error)',
      icon: <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />,
    },
    {
      label: 'Auto-Closed This Month',
      value: data?.autoClosedThisMonth ?? 0,
      color: 'var(--color-slate)',
      icon: <CheckCircle size={20} style={{ color: 'var(--color-slate)' }} />,
    },
  ];

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  if (loading) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', color: 'var(--color-slate)',
        background: 'var(--background)', borderRadius: 12, border: '1px solid var(--color-silver)',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--background)', borderRadius: 12,
      border: '1px solid var(--color-silver)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--color-silver)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Calendar size={18} style={{ color: 'var(--color-teal)' }} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
          PO Expiry Tracker
        </h3>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 20px' }}>
        {statCards.map((card) => (
          <div key={card.label} style={{
            padding: '14px 16px', borderRadius: 12, background: 'var(--color-cloud)',
            border: '1px solid var(--color-silver)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {card.icon}
              <span style={{ fontSize: 11, color: 'var(--color-slate)', fontWeight: 500 }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* PO List */}
      {data?.expiringPOs && data.expiringPOs.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
            Upcoming Expirations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.expiringPOs.map((po) => {
              const expiry = new Date(po.expiryDate);
              const formatted = expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              return (
                <div key={po.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: 'var(--color-cloud)', borderRadius: 8, border: '1px solid var(--color-silver)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{po.poNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                      {po.vendorName} &middot; {formatted} &middot; {fmt(po.totalValue)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {onExtend && (
                      <button
                        onClick={() => onExtend(po.id)}
                        style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          border: '1px solid var(--color-teal)', background: 'transparent',
                          color: 'var(--color-teal)', cursor: 'pointer',
                        }}
                      >
                        Extend
                      </button>
                    )}
                    {onClose && (
                      <button
                        onClick={() => onClose(po.id)}
                        style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          border: '1px solid var(--color-error)', background: 'transparent',
                          color: 'var(--color-error)', cursor: 'pointer',
                        }}
                      >
                        Close
                      </button>
                    )}
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--color-slate)' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
