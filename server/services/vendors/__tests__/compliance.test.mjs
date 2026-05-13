import { describe, it, expect } from 'vitest';
import { projectVendorCompliance, firstKnownTdsSection } from '../compliance.mjs';

// Mirror of src/utils/determineTDS — imported via dynamic require so we can
// assert that the projected compliance flows correctly into the engine.
import { determineTDS } from '../../../../src/utils/determineTDS.ts';

const baseVendor = {
  id: 'v-1',
  vendor_code: 'V-TEST-001',
  vendor_legal_name: 'Test Vendor Pvt Ltd',
  vendor_type: 'service_provider',
  state: 'Maharashtra',
};

const verifiedPan = {
  pan: 'AAACT0001Z',
  pan_status: 'verified',
  entity_type: 'private_limited',
  section_206ab: 'not_applicable',
  tds_sections: JSON.stringify(['194J', '194C_IND']),
  rcm_applicable: 'no_forward_charge',
  lower_tds_section: 'not_applicable',
  lower_tds_cert_number: null,
  lower_tds_cert_rate: 0,
  msme_category: null,
};

const gstRow = { gstin: '27AABCT0001Z1Z5', registration_status: 'regular' };

describe('projectVendorCompliance', () => {
  it('returns the full shape for a verified, ITR-filing company', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: verifiedPan,
      gstRow,
    });

    expect(out.vendorId).toBe('v-1');
    expect(out.vendorCode).toBe('V-TEST-001');
    expect(out.panValid).toBe(true);
    expect(out.section206ab).toBe(false);
    expect(out.itrFiled).toBe(true);
    expect(out.vendorType).toBe('company');
    expect(out.tdsSection).toBe('194J');
    expect(out.tdsRate).toBe(10);
    expect(out.gstReg).toBe('reg');
    expect(out.rcmApplicable).toBe(false);
    expect(out.tdsExempt).toBe(false);
  });

  it('marks panValid=false when pan_status is not verified', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, pan_status: 'not_verified' },
      gstRow,
    });
    expect(out.panValid).toBe(false);
  });

  it('marks panValid=false when pan does not match AAAAA9999A regex', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, pan: 'INVALID123' },
      gstRow,
    });
    expect(out.panValid).toBe(false);
  });

  it('classifies individual / sole proprietor entity types as indiv vendorType', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, entity_type: 'individual' },
      gstRow,
    });
    expect(out.vendorType).toBe('indiv');
    // 194J rate is 10% for both indiv and company; verify rate still derives.
    expect(out.tdsRate).toBe(10);
  });

  it('keeps vendorType=company for partnerships (firms are non-individual)', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, entity_type: 'partnership' },
      gstRow,
    });
    expect(out.vendorType).toBe('company');
  });

  it('section206ab=true → itrFiled=false (drives 206AB branch)', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, section_206ab: 'applicable' },
      gstRow,
    });
    expect(out.section206ab).toBe(true);
    expect(out.itrFiled).toBe(false);
  });

  it('preserves msme_category when set', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, msme_category: 'small' },
      gstRow,
    });
    expect(out.msmeCategory).toBe('small');
  });

  it('null pan row → safe defaults (panValid=false, tdsSection=None)', () => {
    const out = projectVendorCompliance({ vendor: baseVendor, pan: null, gstRow });
    expect(out.panValid).toBe(false);
    expect(out.tdsSection).toBe('None');
    expect(out.tdsRate).toBe(0);
  });

  it('null gst row → gstReg=unreg', () => {
    const out = projectVendorCompliance({ vendor: baseVendor, pan: verifiedPan, gstRow: null });
    expect(out.gstReg).toBe('unreg');
    expect(out.gstin).toBeNull();
  });

  it('lower_tds_section + cert_number → lowerCert=true', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: {
        ...verifiedPan,
        lower_tds_section: '194J',
        lower_tds_cert_number: 'LDC-001',
        lower_tds_cert_rate: 2.5,
      },
      gstRow,
    });
    expect(out.lowerCert).toBe(true);
    expect(out.lowerRate).toBe(2.5);
  });

  it('rcm_applicable non-default → rcmApplicable=true', () => {
    const out = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, rcm_applicable: 'forward_charge_optional' },
      gstRow,
    });
    expect(out.rcmApplicable).toBe(true);
  });
});

describe('firstKnownTdsSection', () => {
  it('strips _IND / _COMP suffixes', () => {
    expect(firstKnownTdsSection(['194C_IND'])).toBe('194C');
    expect(firstKnownTdsSection(['194J_COMP'])).toBe('194J');
  });

  it('parses JSON string input', () => {
    expect(firstKnownTdsSection(JSON.stringify(['194I']))).toBe('194I');
  });

  it('returns None for unknown sections', () => {
    expect(firstKnownTdsSection(['194Z'])).toBe('None');
    expect(firstKnownTdsSection([])).toBe('None');
    expect(firstKnownTdsSection(null)).toBe('None');
  });
});

describe('projected compliance → determineTDS', () => {
  it('panValid=false → determineTDS fires the 206AA branch at 20%', () => {
    const compliance = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, pan_status: 'not_verified' },
      gstRow,
    });
    expect(compliance.panValid).toBe(false);

    const out = determineTDS({
      itemMaster: { tdsSec: '194C', threshold: 0 },
      vendorMaster: {
        type: compliance.vendorType,
        panValid: compliance.panValid,
        lowerCert: compliance.lowerCert,
        lowerRate: compliance.lowerRate,
        tdsExempt: compliance.tdsExempt,
        itrFiled: compliance.itrFiled,
      },
      amount: 100000,
    });
    expect(out.override).toBe('206AA');
    expect(out.rate).toBe(20);
  });

  it('section206ab=true → determineTDS fires 206AB at max(standard,5)', () => {
    const compliance = projectVendorCompliance({
      vendor: baseVendor,
      pan: { ...verifiedPan, section_206ab: 'applicable' },
      gstRow,
    });
    expect(compliance.itrFiled).toBe(false);

    const out = determineTDS({
      itemMaster: { tdsSec: '194Q', threshold: 0 },
      vendorMaster: {
        type: compliance.vendorType,
        panValid: compliance.panValid,
        lowerCert: compliance.lowerCert,
        lowerRate: compliance.lowerRate,
        tdsExempt: compliance.tdsExempt,
        itrFiled: compliance.itrFiled,
      },
      amount: 100000,
    });
    expect(out.override).toBe('206AB');
    expect(out.rate).toBe(5);
  });
});
