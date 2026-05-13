/**
 * Project a (vendors, vendor_pan_compliance, vendor_gst_registrations) row
 * triple into the compliance shape consumed by `determineTDS` + `determineGST`
 * in the invoice forms.
 *
 * Inputs are raw DB rows (snake_case columns). Output is camelCase mirroring
 * `VendorCompliance` in `src/lib/invoice/vendorComplianceLookup.ts`.
 *
 * Pure function — no DB access, fully unit-testable.
 */

const INDIV_ENTITY_TYPES = new Set(['individual', 'sole_proprietor', 'sole_prop', 'huf']);
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

/**
 * Best-effort first-section extraction. Strips legacy `_IND` / `_COMP` suffixes
 * that earlier seeds used and falls back to 'None' for unknown values.
 */
export function firstKnownTdsSection(tdsSectionsRaw) {
  let sections = [];
  if (Array.isArray(tdsSectionsRaw)) {
    sections = tdsSectionsRaw;
  } else if (typeof tdsSectionsRaw === 'string' && tdsSectionsRaw.trim() !== '') {
    try {
      const parsed = JSON.parse(tdsSectionsRaw);
      sections = Array.isArray(parsed) ? parsed : [];
    } catch {
      sections = [];
    }
  }
  const first = String(sections[0] || 'None').replace(/_IND$|_COMP$/i, '');
  const knownSections = new Set(['194C', '194J', '194I', '194Q']);
  return knownSections.has(first) ? first : 'None';
}

export function standardTdsRate(section, vendorType) {
  if (section === '194C') return vendorType === 'company' ? 2 : 1;
  if (section === '194J' || section === '194I') return 10;
  if (section === '194Q') return 0.1;
  return 0;
}

/**
 * Project DB rows into the compliance shape.
 *
 * @param {object} args
 * @param {object} args.vendor    Raw row from p2p_schema_mt.vendors. Required fields:
 *                                id, vendor_code, vendor_legal_name, state.
 * @param {object|null} args.pan  Raw row from vendor_pan_compliance, or null.
 * @param {object|null} args.gstRow Raw row from vendor_gst_registrations, or null.
 */
export function projectVendorCompliance({ vendor, pan = null, gstRow = null }) {
  if (!vendor) {
    throw new Error('projectVendorCompliance: vendor is required');
  }

  const entityType = pan?.entity_type ?? null;
  const vendorType =
    entityType && INDIV_ENTITY_TYPES.has(String(entityType).toLowerCase()) ? 'indiv' : 'company';

  const tdsSection = firstKnownTdsSection(pan?.tds_sections);
  const tdsRate = standardTdsRate(tdsSection, vendorType);

  const panValid = pan?.pan_status === 'verified' && PAN_REGEX.test(pan?.pan || '');
  const section206ab = pan?.section_206ab === 'applicable';
  const itrFiled = !section206ab;

  const lowerCert =
    Boolean(pan?.lower_tds_section) &&
    pan.lower_tds_section !== 'not_applicable' &&
    Boolean(pan?.lower_tds_cert_number);
  const lowerRate = Number(pan?.lower_tds_cert_rate ?? 0) || 0;

  const rcmApplicable = Boolean(pan?.rcm_applicable) && pan.rcm_applicable !== 'no_forward_charge';

  const gstReg = gstRow?.gstin ? 'reg' : 'unreg';

  return {
    vendorId: vendor.id,
    vendorCode: vendor.vendor_code,
    vendorName: vendor.vendor_legal_name,
    vendorState: vendor.state || null,
    gstin: gstRow?.gstin || null,
    gstReg,
    vendorType,
    panValid,
    tdsExempt: false,
    tdsSection,
    tdsRate,
    lowerCert,
    lowerRate,
    itrFiled,
    section206ab,
    rcmApplicable,
    msmeCategory: pan?.msme_category || null,
    entityType,
  };
}
