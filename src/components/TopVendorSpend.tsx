import { useDashboardData } from '../contexts/DashboardDataContext';
import { useMasterData } from '../contexts/MasterDataContext';

interface VendorData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export function TopVendorSpend() {
  const { pos, metrics } = useDashboardData();
  const { vendors } = useMasterData();

  // Calculate vendor spend from PO data
  const vendorSpendMap = new Map<string, number>();

  pos.forEach((po) => {
    const currentSpend = vendorSpendMap.get(po.vendorId) || 0;
    // Convert to base currency if consolidated
    const amount = metrics.isConsolidated
      ? convertToBaseCurrency(po.totalAmount, po.currency)
      : po.totalAmount;
    vendorSpendMap.set(po.vendorId, currentSpend + amount);
  });

  // Convert to basic exchange rates for consolidated view
  function convertToBaseCurrency(amount: number, currency: string): number {
    if (currency === 'INR') return amount;
    const rates: { [key: string]: number } = {
      AED: 22.68,
      USD: 83.25,
      EUR: 90.5,
      GBP: 105.2,
    };
    return amount * (rates[currency] || 1);
  }

  // Sort and get top 5 vendors
  const topVendors = Array.from(vendorSpendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vendorId, amount]) => {
      const vendor = vendors.find((v) => v.id === vendorId);
      return {
        vendorId,
        name: vendor?.name || vendorId,
        amount,
      };
    });

  const maxSpend = topVendors[0]?.amount || 1;

  // Map to chart format with colors
  const colors = [
    '#2A3A42',
    'var(--color-teal)',
    'var(--color-teal-dark)',
    'var(--color-mercury-grey)',
    'var(--color-slate)',
  ];
  const vendorData: VendorData[] = topVendors.map((vendor, index) => ({
    name: vendor.name,
    amount: vendor.amount,
    percentage: Math.round((vendor.amount / maxSpend) * 100),
    color: colors[index % colors.length],
  }));

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: metrics.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
      <h2 className="text-lg mb-6" style={{ color: 'var(--color-ink)' }}>
        Top Vendor Spend{' '}
        {metrics.isConsolidated && (
          <span style={{ color: 'var(--color-mercury-grey)', fontSize: '0.875rem' }}>
            (All Entities)
          </span>
        )}
      </h2>

      <div className="space-y-6">
        {vendorData.length > 0 ? (
          vendorData.map((vendor, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: '#2A3A42' }}>
                  {index + 1}. {vendor.name}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  {formatCurrency(vendor.amount)}
                </span>
              </div>
              <div
                className="w-full rounded-full h-2"
                style={{ backgroundColor: 'var(--color-cloud)' }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${vendor.percentage}%`,
                    background: vendor.color,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            No vendor spend data available
          </div>
        )}
      </div>
    </div>
  );
}
