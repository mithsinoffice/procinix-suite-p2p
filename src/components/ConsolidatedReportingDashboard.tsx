/**
 * CONSOLIDATED REPORTING DASHBOARD - VIEW-ONLY
 * 
 * Multi-entity, multi-currency consolidated view that demonstrates:
 * - Total Spend across all entities
 * - Total Payables across all entities
 * - Total Payments across all entities
 * - Currency conversion ONLY in this dashboard (NOT in transactions)
 * 
 * PRIMARY RULES:
 * - Transactions remain single-currency per entity
 * - Currency conversion ONLY for reporting purposes
 * - Uses Exchange Rate Master for FX conversion
 * - Default base currency: INR
 * 
 * REGRESSION SAFETY:
 * - Zero impact on transaction logic
 * - Pure read-only aggregation
 * - No modifications to transaction data
 */

import { useState } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  Building2, 
  Info,
  Globe,
  ArrowRightLeft,
  BarChart3,
  Coins
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';

interface EntitySpendData {
  entityId: string;
  entityName: string;
  country: string;
  currency: string;
  totalSpend: number;
  totalPayables: number;
  totalPayments: number;
}

export function ConsolidatedReportingDashboard() {
  const { 
    entities, 
    getExchangeRate, 
    getCurrencyByCode,
    getActiveEntities 
  } = useMasterData();

  // Base currency for consolidated reporting
  const BASE_CURRENCY = 'INR';
  const baseCurrencyDetails = getCurrencyByCode(BASE_CURRENCY);

  // Mock entity-wise spend data (in production, this comes from transaction aggregation)
  const entitySpendData: EntitySpendData[] = [
    {
      entityId: 'ENT-SUBKO-IN',
      entityName: 'Subko Coffee Pvt Ltd – India',
      country: 'India',
      currency: 'INR',
      totalSpend: 2500000, // ₹25,00,000
      totalPayables: 850000, // ₹8,50,000
      totalPayments: 1650000 // ₹16,50,000
    },
    {
      entityId: 'ENT-SUBKO-UAE',
      entityName: 'Subko Coffee – Dubai',
      country: 'UAE',
      currency: 'AED',
      totalSpend: 120000, // AED 1,20,000
      totalPayables: 45000, // AED 45,000
      totalPayments: 75000 // AED 75,000
    },
    {
      entityId: 'ENT-PROCINIX-IN',
      entityName: 'Procinix Ltd – India',
      country: 'India',
      currency: 'INR',
      totalSpend: 3200000, // ₹32,00,000
      totalPayables: 980000, // ₹9,80,000
      totalPayments: 2220000 // ₹22,20,000
    }
  ];

  /**
   * Convert amount to base currency using Exchange Rate Master
   * IMPORTANT: This conversion happens ONLY in this dashboard
   * Transaction data remains unchanged in entity's functional currency
   */
  const convertToBaseCurrency = (amount: number, fromCurrency: string): number => {
    // If already in base currency, no conversion needed
    if (fromCurrency === BASE_CURRENCY) {
      return amount;
    }

    // Get exchange rate from Exchange Rate Master
    const rate = getExchangeRate(fromCurrency, BASE_CURRENCY);
    
    if (!rate) {
      console.warn(`Exchange rate not found for ${fromCurrency} to ${BASE_CURRENCY}`);
      return amount; // Return original amount if rate not available
    }

    return amount * rate;
  };

  /**
   * Calculate consolidated totals in base currency
   */
  const calculateConsolidatedTotals = () => {
    let totalSpend = 0;
    let totalPayables = 0;
    let totalPayments = 0;

    entitySpendData.forEach(entity => {
      totalSpend += convertToBaseCurrency(entity.totalSpend, entity.currency);
      totalPayables += convertToBaseCurrency(entity.totalPayables, entity.currency);
      totalPayments += convertToBaseCurrency(entity.totalPayments, entity.currency);
    });

    return { totalSpend, totalPayables, totalPayments };
  };

  const consolidated = calculateConsolidatedTotals();

  /**
   * Format currency amount
   */
  const formatAmount = (amount: number, currencyCode: string = BASE_CURRENCY) => {
    const currency = getCurrencyByCode(currencyCode);
    const symbol = currency?.symbol || '₹';
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A0F14]">Consolidated Reporting</h1>
              <p className="mt-1 text-sm text-[#6E7A82]">
                Multi-entity, multi-currency view aggregated to base currency
              </p>
            </div>
            
            {/* Base Currency Indicator */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg">
              <Globe className="w-5 h-5 text-teal-600" />
              <div>
                <div className="text-xs text-teal-700">Base Currency</div>
                <div className="font-semibold text-teal-900">
                  {baseCurrencyDetails?.symbol} {BASE_CURRENCY} ({baseCurrencyDetails?.name})
                </div>
              </div>
            </div>
          </div>

          {/* Information Banner */}
          <div className="mt-4 flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Currency Conversion Notice:</strong> Amounts converted using exchange rates from Exchange Rate Master. 
              All transactions remain in their respective entity's functional currency. This conversion is for reporting purposes only.
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 space-y-6">
        {/* Consolidated Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Spend */}
          <div className="bg-white border border-[#E1E6EA] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-[#6E7A82]">Total Spend</div>
                  <div className="text-2xl font-semibold text-[#0A0F14]">
                    {formatAmount(consolidated.totalSpend)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E1E6EA]">
              <div className="text-xs text-[#6E7A82]">Across all entities</div>
            </div>
          </div>

          {/* Total Payables */}
          <div className="bg-white border border-[#E1E6EA] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-[#6E7A82]">Total Payables</div>
                  <div className="text-2xl font-semibold text-[#0A0F14]">
                    {formatAmount(consolidated.totalPayables)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E1E6EA]">
              <div className="text-xs text-[#6E7A82]">Outstanding across entities</div>
            </div>
          </div>

          {/* Total Payments */}
          <div className="bg-white border border-[#E1E6EA] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-[#6E7A82]">Total Payments</div>
                  <div className="text-2xl font-semibold text-[#0A0F14]">
                    {formatAmount(consolidated.totalPayments)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E1E6EA]">
              <div className="text-xs text-[#6E7A82]">Paid across entities</div>
            </div>
          </div>
        </div>

        {/* Entity-wise Breakdown */}
        <div className="bg-white border border-[#E1E6EA] rounded-lg">
          <div className="px-6 py-4 border-b border-[#E1E6EA]">
            <h2 className="font-semibold text-[#0A0F14]">Entity-wise Breakdown</h2>
            <p className="text-sm text-[#6E7A82] mt-1">
              Detailed view with currency conversion to {BASE_CURRENCY}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC] border-b border-[#E1E6EA]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Spend (Original)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Spend ({BASE_CURRENCY})
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Payables ({BASE_CURRENCY})
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#6E7A82] uppercase tracking-wider">
                    Payments ({BASE_CURRENCY})
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E1E6EA]">
                {entitySpendData.map((entity, index) => {
                  const currency = getCurrencyByCode(entity.currency);
                  const exchangeRate = entity.currency !== BASE_CURRENCY 
                    ? getExchangeRate(entity.currency, BASE_CURRENCY) 
                    : null;

                  return (
                    <tr key={entity.entityId} className="hover:bg-[#F6F9FC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded">
                            <Building2 className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-medium text-[#0A0F14]">{entity.entityName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6E7A82]">
                        {entity.country}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-teal-600" />
                          <span className="font-medium text-[#0A0F14]">
                            {currency?.symbol} {entity.currency}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-[#0A0F14]">
                        {formatAmount(entity.totalSpend, entity.currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-[#0A0F14]">
                          {formatAmount(convertToBaseCurrency(entity.totalSpend, entity.currency))}
                        </div>
                        {exchangeRate && (
                          <div className="text-xs text-[#6E7A82] mt-1">
                            @ {exchangeRate.toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-orange-600">
                        {formatAmount(convertToBaseCurrency(entity.totalPayables, entity.currency))}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-teal-600">
                        {formatAmount(convertToBaseCurrency(entity.totalPayments, entity.currency))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-[#00A9B7]">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right font-semibold text-[#0A0F14]">
                    Consolidated Total ({BASE_CURRENCY})
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-[#0A0F14] text-lg">
                    {formatAmount(consolidated.totalSpend)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-orange-600 text-lg">
                    {formatAmount(consolidated.totalPayables)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-teal-600 text-lg">
                    {formatAmount(consolidated.totalPayments)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Exchange Rate Reference */}
        <div className="bg-white border border-[#E1E6EA] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <ArrowRightLeft className="w-5 h-5 text-[#00A9B7]" />
            <h3 className="font-semibold text-[#0A0F14]">Exchange Rates Used</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {entitySpendData
              .filter(entity => entity.currency !== BASE_CURRENCY)
              .map(entity => {
                const rate = getExchangeRate(entity.currency, BASE_CURRENCY);
                const currency = getCurrencyByCode(entity.currency);
                
                return (
                  <div key={entity.currency} className="flex items-center gap-3 p-3 bg-[#F6F9FC] rounded-lg border border-[#E1E6EA]">
                    <div className="text-sm text-[#6E7A82]">
                      1 {currency?.symbol} {entity.currency} =
                    </div>
                    <div className="font-semibold text-[#0A0F14]">
                      {baseCurrencyDetails?.symbol} {rate?.toFixed(4)} {BASE_CURRENCY}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E1E6EA]">
            <div className="flex items-start gap-2 text-xs text-[#6E7A82]">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                Exchange rates are sourced from Exchange Rate Master. In production, these would be updated regularly. 
                For demo purposes, rates are static and manually maintained.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * INTEGRATION NOTES:
 * 
 * 1. This dashboard is PURE READ-ONLY - no transaction modifications
 * 2. Currency conversion logic ONLY exists here, NOT in transaction forms
 * 3. Transactions continue to operate in entity's functional currency
 * 4. Exchange rates pulled from Exchange Rate Master
 * 5. Base currency (INR) configurable but read-only for demo
 * 6. In production, entity spend data would come from transaction aggregation queries
 * 
 * REGRESSION SAFETY:
 * - Zero impact on PR, PO, GRN, Invoice, Debit Note, Payment logic
 * - No shared calculation functions with transactions
 * - Completely isolated reporting component
 */
