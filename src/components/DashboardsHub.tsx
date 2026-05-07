import { useState } from 'react';
import { Users, TrendingUp, ShoppingCart } from 'lucide-react';
import { ProcurementDeskAdvanced } from './ProcurementDeskAdvanced';
import { APDeskAdvanced } from './APDeskAdvanced';
import { CFODeskAdvanced } from './CFODeskAdvanced';

/**
 * DASHBOARDS HUB
 * Enterprise-grade dashboard selector for different desk views
 */

export function DashboardsHub() {
  const [selectedDesk, setSelectedDesk] = useState<'procurement' | 'ap' | 'cfo'>('procurement');

  const deskOptions = [
    {
      id: 'procurement' as const,
      name: 'Procurement Desk',
      description: 'Strategic procurement metrics and supplier performance',
      icon: ShoppingCart,
      color: '#007D87',
    },
    {
      id: 'ap' as const,
      name: 'AP Desk Dashboard',
      description: 'Operational metrics for Accounts Payable team',
      icon: Users,
      color: 'var(--color-teal)',
    },
    {
      id: 'cfo' as const,
      name: 'CFO Desk Dashboard',
      description: 'Strategic financial metrics and executive insights',
      icon: TrendingUp,
      color: 'var(--color-teal-dark)',
    },
  ];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-cloud)' }}>
      {/* Header with Desk Selector */}
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid var(--color-silver)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
              Dashboards
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              Advanced analytics and metrics for decision-making
            </p>
          </div>

          {/* Desk Selector Pills */}
          <div className="flex gap-3">
            {deskOptions.map((desk) => {
              const Icon = desk.icon;
              const isSelected = selectedDesk === desk.id;

              return (
                <button
                  key={desk.id}
                  onClick={() => setSelectedDesk(desk.id)}
                  className="flex items-center gap-3 px-6 py-3 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? desk.color : '#FFFFFF',
                    border: `1px solid ${isSelected ? desk.color : 'var(--color-silver)'}`,
                    color: isSelected ? '#FFFFFF' : 'var(--color-ink)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm" style={{ fontWeight: '600' }}>
                      {desk.name}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{
                        color: isSelected
                          ? 'rgba(255, 255, 255, 0.85)'
                          : 'var(--color-mercury-grey)',
                        fontWeight: '400',
                      }}
                    >
                      {desk.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto">
        {selectedDesk === 'procurement' && <ProcurementDeskAdvanced />}
        {selectedDesk === 'ap' && <APDeskAdvanced />}
        {selectedDesk === 'cfo' && <CFODeskAdvanced />}
      </div>
    </div>
  );
}
