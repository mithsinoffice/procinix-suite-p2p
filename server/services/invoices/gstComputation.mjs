// GST auto-computation engine per ws1a-implementation-plan.md §2.9.
//
// computeGstForLine: given taxable amount + GST rate + place of supply,
// splits into CGST/SGST/UTGST/IGST/Cess per GST rules.
//
// validateGstAgainstOcr: compares computed GST vs OCR-extracted values
// per gst_validation_config thresholds (rounding / minor / material).
//
// loadGstValidationConfig: reads per-tenant config from DB with defaults.

// Union Territory state codes that use UTGST instead of SGST.
// 07 (Delhi) and 34 (Puducherry) are UTs but legislatively treated as
// states for GST — they use SGST, not UTGST.
const UT_STATE_CODES = new Set(['04', '26', '25', '35', '31', '97']);

const DEFAULT_CONFIG = Object.freeze({
  rounding_tolerance_rupees: 1.00,
  minor_variance_rupees: 10.00,
  minor_variance_pct: 0.50,
  auto_correct_minor_variance: true,
});

/**
 * Banker's rounding (half-to-even) to 2 decimal places.
 */
function bankersRound(value) {
  const shifted = value * 100;
  const floor = Math.floor(shifted);
  const diff = shifted - floor;

  if (Math.abs(diff - 0.5) < 1e-10) {
    // Exact half — round to even
    return (floor % 2 === 0 ? floor : floor + 1) / 100;
  }
  return Math.round(shifted) / 100;
}

/**
 * Compute GST breakdown for a single line item.
 *
 * @param {object} opts
 * @param {number} opts.taxableAmount - Line taxable amount
 * @param {number} opts.gstRate - GST rate as percentage (e.g. 18 for 18%)
 * @param {string} opts.placeOfSupply - 2-digit state code of supply
 * @param {string} opts.receivingEntityState - 2-digit state code of receiving entity
 * @param {boolean} [opts.isRcm=false] - Reverse charge mechanism applies
 * @param {number} [opts.cessRate=0] - Cess rate as percentage
 * @returns {{ cgstAmount: number, sgstAmount: number, utgstAmount: number, igstAmount: number, cessAmount: number, totalGst: number, isRcm: boolean, isInterState: boolean, isUtTerritory: boolean }}
 */
export function computeGstForLine({ taxableAmount, gstRate, placeOfSupply, receivingEntityState, isRcm = false, cessRate = 0 }) {
  const amount = Number(taxableAmount) || 0;
  const rate = Number(gstRate) || 0;
  const cess = Number(cessRate) || 0;

  const isInterState = placeOfSupply !== receivingEntityState;
  const isUtTerritory = UT_STATE_CODES.has(receivingEntityState);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let utgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = bankersRound(amount * rate / 100);
  } else {
    const halfRate = rate / 2;
    cgstAmount = bankersRound(amount * halfRate / 100);
    if (isUtTerritory) {
      utgstAmount = bankersRound(amount * halfRate / 100);
    } else {
      sgstAmount = bankersRound(amount * halfRate / 100);
    }
  }

  const cessAmount = cess > 0 ? bankersRound(amount * cess / 100) : 0;
  const totalGst = bankersRound(cgstAmount + sgstAmount + utgstAmount + igstAmount + cessAmount);

  return {
    cgstAmount,
    sgstAmount,
    utgstAmount,
    igstAmount,
    cessAmount,
    totalGst,
    isRcm,
    isInterState,
    isUtTerritory,
  };
}

/**
 * Compare computed GST vs OCR-extracted GST values per gst_validation_config.
 *
 * @param {{ cgstAmount: number, sgstAmount: number, igstAmount: number, utgstAmount: number, cessAmount: number, totalGst: number }} computed
 * @param {{ cgst_amount?: number, sgst_amount?: number, igst_amount?: number, utgst_amount?: number, cess_amount?: number, total_gst?: number }} ocrExtracted
 * @param {object} config - From loadGstValidationConfig
 * @returns {{ status: 'exact'|'minor_variance'|'material_variance', useComputed: boolean, discrepancy?: object, exceptionReason?: string }}
 */
export function validateGstAgainstOcr(computed, ocrExtracted, config = DEFAULT_CONFIG) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const fields = [
    ['cgstAmount', 'cgst_amount'],
    ['sgstAmount', 'sgst_amount'],
    ['igstAmount', 'igst_amount'],
    ['utgstAmount', 'utgst_amount'],
    ['cessAmount', 'cess_amount'],
    ['totalGst', 'total_gst'],
  ];

  let maxAbsDiff = 0;
  let maxPctDiff = 0;
  const discrepancies = {};

  for (const [computedKey, ocrKey] of fields) {
    const computedVal = computed[computedKey] ?? 0;
    const ocrVal = Number(ocrExtracted[ocrKey] ?? 0);
    const absDiff = Math.abs(computedVal - ocrVal);

    if (absDiff > 0) {
      const pctDiff = ocrVal !== 0 ? (absDiff / Math.abs(ocrVal)) * 100 : (computedVal !== 0 ? 100 : 0);
      discrepancies[computedKey] = {
        computed: computedVal,
        ocr: ocrVal,
        difference: bankersRound(computedVal - ocrVal),
        differencePct: bankersRound(pctDiff),
      };

      if (absDiff > maxAbsDiff) maxAbsDiff = absDiff;
      if (pctDiff > maxPctDiff) maxPctDiff = pctDiff;
    }
  }

  // No differences at all
  if (maxAbsDiff === 0) {
    return { status: 'exact', useComputed: true };
  }

  // Within rounding tolerance
  if (maxAbsDiff <= cfg.rounding_tolerance_rupees) {
    return { status: 'exact', useComputed: true };
  }

  // Minor variance: within rupees OR within percentage
  if (maxAbsDiff <= cfg.minor_variance_rupees || maxPctDiff <= cfg.minor_variance_pct) {
    return {
      status: 'minor_variance',
      useComputed: true,
      discrepancy: discrepancies,
    };
  }

  // Material variance
  return {
    status: 'material_variance',
    useComputed: false,
    discrepancy: discrepancies,
    exceptionReason: 'gst_variance',
  };
}

/**
 * Load GST validation config for a tenant. Falls back to column defaults
 * if no row exists.
 *
 * @param {string} tenantId
 * @param {{ query: Function }} db
 * @returns {Promise<object>}
 */
export async function loadGstValidationConfig(tenantId, db) {
  const rows = await db.query(
    'SELECT rounding_tolerance_rupees, minor_variance_rupees, minor_variance_pct, auto_correct_minor_variance FROM gst_validation_config WHERE tenant_id = ?',
    [tenantId]
  );

  if (!rows || rows.length === 0) {
    return { ...DEFAULT_CONFIG };
  }

  const row = rows[0];
  return {
    rounding_tolerance_rupees: Number(row.rounding_tolerance_rupees ?? DEFAULT_CONFIG.rounding_tolerance_rupees),
    minor_variance_rupees: Number(row.minor_variance_rupees ?? DEFAULT_CONFIG.minor_variance_rupees),
    minor_variance_pct: Number(row.minor_variance_pct ?? DEFAULT_CONFIG.minor_variance_pct),
    auto_correct_minor_variance: Boolean(row.auto_correct_minor_variance ?? DEFAULT_CONFIG.auto_correct_minor_variance),
  };
}
