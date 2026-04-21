/**
 * SHARED MASTER-LINKED COMPONENTS - AP AUTOMATION
 * 
 * GOVERNANCE RULES:
 * 
 * 1. ALL modules under AP Automation MUST use these components for master data selection
 * 2. DO NOT create standalone dropdowns or local master data arrays
 * 3. These components are linked to the System of Record (MasterDataContext)
 * 4. Any updates to master data automatically reflect across all modules
 * 
 * COMPONENT LIST:
 * - VendorSelector: For selecting vendors (Procurement, AP, Payments, Advances)
 * - ItemSelector: For selecting items (Procurement, AP, GRN)
 * - EntitySelector: For selecting legal entities (Procurement, AP, Payments, Budgeting)
 * - CostCentreSelector: For cost allocation (Procurement, AP, Budgeting)
 * - TaxCodeSelector: For tax selection (Procurement, AP)
 * - AccountCodeSelector: For GL account selection (AP, Payments, Budgeting)
 * - DepartmentSelector: For department selection scoped by entity (AP invoices, etc.)
 * 
 * USAGE EXAMPLE:
 * ```tsx
 * import { VendorSelector } from './components/shared';
 * 
 * function MyComponent() {
 *   const [vendorId, setVendorId] = useState('');
 *   
 *   return (
 *     <VendorSelector
 *       value={vendorId}
 *       onChange={setVendorId}
 *       required
 *       showMSMEBadge
 *     />
 *   );
 * }
 * ```
 */

export { VendorSelector } from './VendorSelector';
export { ItemSelector } from './ItemSelector';
export { EntitySelector } from './EntitySelector';
export { CostCentreSelector } from './CostCentreSelector';
export { TaxCodeSelector } from './TaxCodeSelector';
export { AccountCodeSelector } from './AccountCodeSelector';
export { DepartmentSelector } from './DepartmentSelector';
