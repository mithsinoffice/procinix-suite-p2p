import { randomUUID } from 'crypto';

/**
 * Ongrid Gridlines KYC integration.
 *
 * Endpoints used:
 *   POST /pan-api/fetch                       -> verifyPAN
 *   POST /pan-api/pan-comprehensive/fetch     -> verifyPANComprehensive (for companies)
 *   POST /gstin-api/fetch                     -> verifyGSTIN
 *   POST /bank-api/penny-drop/fetch           -> verifyBankAccount
 *   POST /udyam-api/fetch                     -> verifyMSME
 *
 * Auth:  X-Auth-Token header, X-Api-Version: 1.0
 * Every request body must include `consent: "Y"` and a `reason` string.
 *
 * Falls back to deterministic mock data when ONGRID_MOCK_MODE=true or no API key.
 */

const SANDBOX_DEFAULT = 'https://api.gridlines.io';
const PRODUCTION_DEFAULT = 'https://api.gridlines.io';

function resolveConfig() {
  const apiKey = process.env.ONGRID_API_KEY || '';
  const explicitMock = process.env.ONGRID_MOCK_MODE === 'true';
  const isProd = process.env.NODE_ENV === 'production';
  const baseUrl = isProd
    ? process.env.ONGRID_BASE_URL || PRODUCTION_DEFAULT
    : process.env.ONGRID_SANDBOX_URL || process.env.ONGRID_BASE_URL || SANDBOX_DEFAULT;
  const mockMode = !apiKey || explicitMock;
  return { apiKey, baseUrl, mockMode };
}

function buildHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': apiKey,
    'X-Api-Version': '1.0',
  };
}

/**
 * Map Ongrid PAN "category" values to our internal entity_type codes.
 */
export function mapEntityType(ongridCategory) {
  if (!ongridCategory) return 'unknown';
  const c = String(ongridCategory).toLowerCase();
  if (c.includes('individual')) return 'individual_proprietor';
  if (c.includes('huf')) return 'huf';
  if (c.includes('llp')) return 'llp';
  if (c.includes('partnership') || c.includes('firm')) return 'partnership_firm';
  if (c.includes('trust') || c.includes('society') || c.includes('aop') || c.includes('boi'))
    return 'trust_society';
  if (c.includes('government')) return 'government_body';
  if (c.includes('public')) return 'public_limited';
  if (c.includes('private') || c.includes('company')) return 'private_limited';
  return c.replace(/\s+/g, '_');
}

/**
 * Classify a PAN's owner type from its 4th character.
 *  P=individual, C=company, H=HUF, F=firm, A/T=trust, L=LLP/local, J=individual, G=govt, B=BOI
 */
function panTypeChar(pan) {
  return (pan || '').charAt(3).toUpperCase();
}

function mapPanCharToEntity(typeChar) {
  const map = {
    P: 'individual_proprietor',
    C: 'private_limited',
    H: 'huf',
    F: 'partnership_firm',
    A: 'trust_society',
    T: 'trust_society',
    L: 'llp',
    J: 'individual_proprietor',
    G: 'government_body',
    B: 'trust_society',
  };
  return map[typeChar] || 'private_limited';
}

/**
 * Ongrid HTTP status → user-friendly message.
 */
function mapOngridHttpError(status, payloadMessage) {
  if (status === 401) return 'Ongrid authentication failed. Check ONGRID_API_KEY.';
  if (status === 402) return 'Ongrid credit balance exhausted. Please recharge.';
  if (status === 404) return 'Record not found at source.';
  if (status === 422)
    return payloadMessage || 'Invalid input. The ID format or value is rejected by the source.';
  if (status === 429) return 'Ongrid rate limit hit. Please retry in a few seconds.';
  if (status === 500) return 'Ongrid service error. Please retry.';
  if (status === 503) return 'Source registry temporarily unavailable. Please retry.';
  return payloadMessage || `Ongrid request failed (HTTP ${status}).`;
}

/**
 * POST wrapper with consent + reason enforced.
 */
async function postOngrid(path, body) {
  const { apiKey, baseUrl } = resolveConfig();
  const url = `${baseUrl}${path}`;
  const payload = { consent: 'Y', reason: body.reason || 'Vendor onboarding KYC', ...body };
  const resp = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: resp.status, ok: resp.ok, body: json };
}

async function logKyc(
  queryFn,
  {
    pan = null,
    gstin = null,
    check_type,
    provider,
    success,
    response,
    transaction_id = null,
    mock_mode = false,
  }
) {
  try {
    await queryFn(
      `INSERT INTO vendor_kyc_logs
        (id, pan, gstin, check_type, provider, success, response_json, transaction_id, mock_mode, checked_at)
       VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
      [
        randomUUID(),
        pan,
        gstin,
        check_type,
        provider,
        success ? 1 : 0,
        JSON.stringify(response),
        transaction_id,
        mock_mode ? 1 : 0,
      ]
    );
  } catch {
    /* swallow audit-log errors — do not fail the verification */
  }
}

/* ------------------------------------------------------------------ */
/*  Mock data generators                                               */
/* ------------------------------------------------------------------ */

function mockPan(pan) {
  const typeChar = panTypeChar(pan);
  const entity_type = mapPanCharToEntity(typeChar);
  const isCompany = typeChar === 'C' || typeChar === 'L';
  return {
    pan,
    name: isCompany
      ? `Mock Enterprises ${pan.slice(5, 9)} Pvt Ltd`
      : `Mock User ${pan.slice(0, 5)}`,
    entity_type,
    pan_status: 'VALID',
    date_of_incorporation: isCompany ? '2018-06-15' : null,
    registered_address: {
      address: '42 Business Tower, MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400001',
      country: 'India',
    },
    cin: isCompany ? `U74999MH2018PTC${pan.slice(5, 9)}56` : null,
    directors: isCompany ? ['Rajesh Kumar', 'Priya Sharma'] : [],
    gstin_list: [
      {
        gstin: `27${pan}1Z5`,
        state: 'Maharashtra',
        status: 'Active',
        gst_type: 'registered_regular',
      },
    ],
    msme_status: null,
    company_type: isCompany ? 'Private Limited Company' : 'Individual',
  };
}

function mockGstin(gstin) {
  return {
    gstin,
    legal_name: `Mock Business ${gstin.slice(2, 12)}`,
    trade_name: `Mock Trade Name`,
    pan: gstin.slice(2, 12),
    status: 'Active',
    gst_type: 'Regular',
    state: 'Maharashtra',
    registration_date: '2017-07-01',
    last_return_filed: '2026-03-31',
    return_filing_status: 'regular_filer',
    address: '42 Business Tower, MG Road, Mumbai, 400001',
  };
}

function mockBank(accountNumber, ifsc) {
  return {
    account_number: accountNumber,
    ifsc,
    account_exists: true,
    account_holder_name: 'MOCK ACCOUNT HOLDER PRIVATE LIMITED',
    bank_name: 'MOCK BANK OF INDIA',
    branch: 'MG Road Branch',
    penny_drop_amount: 1,
  };
}

function mockUdyam(udyamNumber) {
  return {
    udyam_number: udyamNumber,
    enterprise_name: `Mock Enterprise ${udyamNumber.slice(-6)}`,
    enterprise_type: 'small',
    major_activity: 'Manufacturing',
    registration_date: '2020-11-05',
    pan: 'AAAAA0000A',
    status: 'Active',
  };
}

/* ------------------------------------------------------------------ */
/*  verifyPAN                                                           */
/* ------------------------------------------------------------------ */
export async function verifyPAN(queryFn, pan, opts = {}) {
  pan = (pan || '').toUpperCase().trim();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return { success: false, error: 'Invalid PAN format. Must be 10 chars: AAAAA0000A' };
  }

  const { mockMode } = resolveConfig();

  if (mockMode) {
    const data = mockPan(pan);
    await logKyc(queryFn, {
      pan,
      check_type: 'pan',
      provider: 'ongrid_mock',
      success: true,
      response: data,
      mock_mode: true,
    });
    return {
      success: true,
      source: 'ongrid_mock',
      mock_mode: true,
      transaction_id: `mock_${randomUUID()}`,
      data,
    };
  }

  try {
    const res = await postOngrid('/pan-api/fetch', {
      pan_number: pan,
      reason: opts.reason || 'Vendor onboarding KYC',
    });
    const txnId = res.body?.transaction_id || res.body?.data?.transaction_id || null;

    if (!res.ok) {
      await logKyc(queryFn, {
        pan,
        check_type: 'pan',
        provider: 'ongrid',
        success: false,
        response: res.body,
        transaction_id: txnId,
      });
      return {
        success: false,
        source: 'ongrid',
        transaction_id: txnId,
        error: mapOngridHttpError(res.status, res.body?.message),
      };
    }

    const d = res.body?.data || res.body || {};
    const pan_data = d.pan_data || d;
    const data = {
      pan,
      name: pan_data.name || pan_data.full_name || pan_data.name_on_card || '',
      entity_type:
        mapEntityType(pan_data.category || pan_data.pan_type) ||
        mapPanCharToEntity(panTypeChar(pan)),
      pan_status: pan_data.pan_status || pan_data.status || 'VALID',
      date_of_incorporation: pan_data.date_of_birth || pan_data.date_of_incorporation || null,
      registered_address: pan_data.address || null,
      cin: null,
      directors: [],
      gstin_list: [],
      msme_status: null,
      company_type: pan_data.category || null,
    };

    await logKyc(queryFn, {
      pan,
      check_type: 'pan',
      provider: 'ongrid',
      success: true,
      response: res.body,
      transaction_id: txnId,
    });
    return { success: true, source: 'ongrid', transaction_id: txnId, data };
  } catch (err) {
    await logKyc(queryFn, {
      pan,
      check_type: 'pan',
      provider: 'ongrid',
      success: false,
      response: { error: err.message },
    });
    return { success: false, error: `Ongrid PAN service error: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/*  verifyPANComprehensive (for companies — returns CIN, directors)    */
/* ------------------------------------------------------------------ */
export async function verifyPANComprehensive(queryFn, pan, opts = {}) {
  pan = (pan || '').toUpperCase().trim();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return { success: false, error: 'Invalid PAN format. Must be 10 chars: AAAAA0000A' };
  }

  const { mockMode } = resolveConfig();

  if (mockMode) {
    const data = mockPan(pan);
    await logKyc(queryFn, {
      pan,
      check_type: 'pan_comprehensive',
      provider: 'ongrid_mock',
      success: true,
      response: data,
      mock_mode: true,
    });
    return {
      success: true,
      source: 'ongrid_mock',
      mock_mode: true,
      transaction_id: `mock_${randomUUID()}`,
      data,
    };
  }

  try {
    const res = await postOngrid('/pan-api/pan-comprehensive/fetch', {
      pan_number: pan,
      reason: opts.reason || 'Vendor onboarding KYC',
    });
    const txnId = res.body?.transaction_id || res.body?.data?.transaction_id || null;

    if (!res.ok) {
      await logKyc(queryFn, {
        pan,
        check_type: 'pan_comprehensive',
        provider: 'ongrid',
        success: false,
        response: res.body,
        transaction_id: txnId,
      });
      return {
        success: false,
        source: 'ongrid',
        transaction_id: txnId,
        error: mapOngridHttpError(res.status, res.body?.message),
      };
    }

    const d = res.body?.data || res.body || {};
    const pan_data = d.pan_data || d;
    const gstList = Array.isArray(pan_data.gstin_list)
      ? pan_data.gstin_list
      : Array.isArray(pan_data.linked_gstin)
        ? pan_data.linked_gstin
        : [];

    const addr = pan_data.address || pan_data.registered_address || {};

    const data = {
      pan,
      name: pan_data.name || pan_data.full_name || pan_data.company_name || '',
      entity_type:
        mapEntityType(pan_data.category || pan_data.pan_type) ||
        mapPanCharToEntity(panTypeChar(pan)),
      pan_status: pan_data.pan_status || pan_data.status || 'VALID',
      date_of_incorporation: pan_data.date_of_incorporation || pan_data.date_of_birth || null,
      registered_address: {
        address: addr.address || addr.line1 || '',
        city: addr.city || '',
        state: addr.state || '',
        pin: addr.pincode || addr.pin || '',
        country: addr.country || 'India',
      },
      cin: pan_data.cin || null,
      directors: Array.isArray(pan_data.directors)
        ? pan_data.directors.map((d) => d.name || d)
        : [],
      gstin_list: gstList.map((g) => ({
        gstin: g.gstin || g.gstin_number || g,
        state: g.state || '',
        status: g.status || 'Active',
        gst_type: g.gst_type || 'registered_regular',
      })),
      msme_status: pan_data.msme_status || null,
      company_type: pan_data.company_type || pan_data.category || null,
    };

    await logKyc(queryFn, {
      pan,
      check_type: 'pan_comprehensive',
      provider: 'ongrid',
      success: true,
      response: res.body,
      transaction_id: txnId,
    });
    return { success: true, source: 'ongrid', transaction_id: txnId, data };
  } catch (err) {
    await logKyc(queryFn, {
      pan,
      check_type: 'pan_comprehensive',
      provider: 'ongrid',
      success: false,
      response: { error: err.message },
    });
    return { success: false, error: `Ongrid PAN Comprehensive service error: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/*  verifyGSTIN                                                         */
/* ------------------------------------------------------------------ */
export async function verifyGSTIN(queryFn, gstin, opts = {}) {
  gstin = (gstin || '').toUpperCase().trim();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
    return { success: false, error: 'Invalid GSTIN format' };
  }

  const { mockMode } = resolveConfig();

  if (mockMode) {
    const data = mockGstin(gstin);
    await logKyc(queryFn, {
      gstin,
      check_type: 'gstin',
      provider: 'ongrid_mock',
      success: true,
      response: data,
      mock_mode: true,
    });
    return {
      success: true,
      source: 'ongrid_mock',
      mock_mode: true,
      transaction_id: `mock_${randomUUID()}`,
      data,
    };
  }

  try {
    const res = await postOngrid('/gstin-api/fetch', {
      gstin,
      reason: opts.reason || 'Vendor onboarding KYC',
    });
    const txnId = res.body?.transaction_id || res.body?.data?.transaction_id || null;

    if (!res.ok) {
      await logKyc(queryFn, {
        gstin,
        check_type: 'gstin',
        provider: 'ongrid',
        success: false,
        response: res.body,
        transaction_id: txnId,
      });
      return {
        success: false,
        source: 'ongrid',
        transaction_id: txnId,
        error: mapOngridHttpError(res.status, res.body?.message),
      };
    }

    const d = res.body?.data || res.body || {};
    const gstin_data = d.gstin_data || d;
    const pr = gstin_data.pradr || gstin_data.principal_address || {};
    const addr = pr.addr || pr;

    const data = {
      gstin,
      legal_name: gstin_data.lgnm || gstin_data.legal_name || '',
      trade_name: gstin_data.tradeNam || gstin_data.trade_name || '',
      pan: gstin.slice(2, 12),
      status: gstin_data.sts || gstin_data.status || 'Active',
      gst_type: gstin_data.dty || gstin_data.gst_type || 'Regular',
      state: addr.stcd || addr.state || '',
      registration_date: gstin_data.rgdt || gstin_data.registration_date || null,
      last_return_filed: gstin_data.last_return_filed || null,
      return_filing_status: gstin_data.return_filing_status || 'regular_filer',
      address: [addr.bno, addr.bnm, addr.st, addr.loc, addr.city, addr.pncd]
        .filter(Boolean)
        .join(', '),
    };

    await logKyc(queryFn, {
      gstin,
      check_type: 'gstin',
      provider: 'ongrid',
      success: true,
      response: res.body,
      transaction_id: txnId,
    });
    return { success: true, source: 'ongrid', transaction_id: txnId, data };
  } catch (err) {
    await logKyc(queryFn, {
      gstin,
      check_type: 'gstin',
      provider: 'ongrid',
      success: false,
      response: { error: err.message },
    });
    return { success: false, error: `Ongrid GSTIN service error: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/*  verifyBankAccount (penny drop)                                      */
/* ------------------------------------------------------------------ */
export async function verifyBankAccount(queryFn, accountNumber, ifsc, opts = {}) {
  accountNumber = (accountNumber || '').trim();
  ifsc = (ifsc || '').toUpperCase().trim();
  if (!/^\d{6,20}$/.test(accountNumber)) {
    return { success: false, error: 'Invalid account number' };
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return { success: false, error: 'Invalid IFSC format' };
  }

  const { mockMode } = resolveConfig();

  if (mockMode) {
    const data = mockBank(accountNumber, ifsc);
    await logKyc(queryFn, {
      check_type: 'bank',
      provider: 'ongrid_mock',
      success: true,
      response: data,
      mock_mode: true,
    });
    return {
      success: true,
      source: 'ongrid_mock',
      mock_mode: true,
      transaction_id: `mock_${randomUUID()}`,
      data,
    };
  }

  try {
    const res = await postOngrid('/bank-api/penny-drop/fetch', {
      account_number: accountNumber,
      ifsc,
      reason: opts.reason || 'Vendor onboarding KYC',
    });
    const txnId = res.body?.transaction_id || res.body?.data?.transaction_id || null;

    if (!res.ok) {
      await logKyc(queryFn, {
        check_type: 'bank',
        provider: 'ongrid',
        success: false,
        response: res.body,
        transaction_id: txnId,
      });
      return {
        success: false,
        source: 'ongrid',
        transaction_id: txnId,
        error: mapOngridHttpError(res.status, res.body?.message),
      };
    }

    const d = res.body?.data || res.body || {};
    const data = {
      account_number: accountNumber,
      ifsc,
      account_exists: d.account_exists ?? true,
      account_holder_name: d.account_holder_name || d.name_at_bank || d.beneficiary_name || '',
      bank_name: d.bank_name || d.bank || '',
      branch: d.branch || '',
      penny_drop_amount: d.penny_drop_amount || 1,
    };

    await logKyc(queryFn, {
      check_type: 'bank',
      provider: 'ongrid',
      success: true,
      response: res.body,
      transaction_id: txnId,
    });
    return { success: true, source: 'ongrid', transaction_id: txnId, data };
  } catch (err) {
    await logKyc(queryFn, {
      check_type: 'bank',
      provider: 'ongrid',
      success: false,
      response: { error: err.message },
    });
    return { success: false, error: `Ongrid bank service error: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/*  verifyMSME (Udyam)                                                  */
/* ------------------------------------------------------------------ */
export async function verifyMSME(queryFn, udyamNumber, opts = {}) {
  udyamNumber = (udyamNumber || '').toUpperCase().trim();
  if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(udyamNumber)) {
    return { success: false, error: 'Invalid Udyam number. Expected: UDYAM-XX-00-0000000' };
  }

  const { mockMode } = resolveConfig();

  if (mockMode) {
    const data = mockUdyam(udyamNumber);
    await logKyc(queryFn, {
      check_type: 'msme',
      provider: 'ongrid_mock',
      success: true,
      response: data,
      mock_mode: true,
    });
    return {
      success: true,
      source: 'ongrid_mock',
      mock_mode: true,
      transaction_id: `mock_${randomUUID()}`,
      data,
    };
  }

  try {
    const res = await postOngrid('/udyam-api/fetch', {
      udyam_number: udyamNumber,
      reason: opts.reason || 'Vendor onboarding KYC',
    });
    const txnId = res.body?.transaction_id || res.body?.data?.transaction_id || null;

    if (!res.ok) {
      await logKyc(queryFn, {
        check_type: 'msme',
        provider: 'ongrid',
        success: false,
        response: res.body,
        transaction_id: txnId,
      });
      return {
        success: false,
        source: 'ongrid',
        transaction_id: txnId,
        error: mapOngridHttpError(res.status, res.body?.message),
      };
    }

    const d = res.body?.data || res.body || {};
    const data = {
      udyam_number: udyamNumber,
      enterprise_name: d.enterprise_name || d.name || '',
      enterprise_type: d.enterprise_type || d.category || '',
      major_activity: d.major_activity || '',
      registration_date: d.registration_date || null,
      pan: d.pan || '',
      status: d.status || 'Active',
    };

    await logKyc(queryFn, {
      check_type: 'msme',
      provider: 'ongrid',
      success: true,
      response: res.body,
      transaction_id: txnId,
    });
    return { success: true, source: 'ongrid', transaction_id: txnId, data };
  } catch (err) {
    await logKyc(queryFn, {
      check_type: 'msme',
      provider: 'ongrid',
      success: false,
      response: { error: err.message },
    });
    return { success: false, error: `Ongrid MSME service error: ${err.message}` };
  }
}
