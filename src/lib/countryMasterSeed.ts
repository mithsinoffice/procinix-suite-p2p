/** Shared seed for Country Master and invitation country dropdown (same table key). */
import type { EntityScopeMapping } from './masters/entityMapping';

export type CountryMasterRow = {
  id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  status: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  entityMappings?: EntityScopeMapping[];
  originalData?: CountryMasterRow;
};

export const COUNTRY_MASTER_SEED: CountryMasterRow[] = [
  { id: '1', countryCode: 'IN', countryName: 'India', currency: 'INR', status: 'Active', approvalStatus: 'Approved' },
  { id: '2', countryCode: 'US', countryName: 'United States', currency: 'USD', status: 'Active', approvalStatus: 'Approved' },
  { id: '3', countryCode: 'GB', countryName: 'United Kingdom', currency: 'GBP', status: 'Active', approvalStatus: 'Pending Approval' },
  { id: '4', countryCode: 'CN', countryName: 'China', currency: 'CNY', status: 'Active', approvalStatus: 'Approved' },
  { id: '5', countryCode: 'BD', countryName: 'Bangladesh', currency: 'BDT', status: 'Active', approvalStatus: 'Draft' },
  { id: '6', countryCode: 'AE', countryName: 'UAE', currency: 'AED', status: 'Active', approvalStatus: 'Approved' },
];

export function selectableCountriesFromMaster(rows: CountryMasterRow[]): CountryMasterRow[] {
  const active = rows.filter((c) => c.status === 'Active');
  const approved = active.filter((c) => c.approvalStatus === 'Approved');
  return approved.length ? approved : active;
}
