import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ComplianceValidationSummary } from './ComplianceValidationSummary';
import { useMasterData } from '../contexts/MasterDataContext';
import type { VendorMaster } from '../contexts/MasterDataContext';

interface BankAccount {
  id: string;
  primary: boolean;
  accountNumber: string;
  ifscCode: string;
  holderName: string;
  verificationStatus: string;
}

interface GSTDetail {
  id: string;
  gstin: string;
  registeredState: string;
  registrationStatus: string;
  detailedAddress: string;
}

interface Document {
  id: string;
  documentName: string;
  validFrom: string;
  validToExpiry: string;
}

interface EntityMapping {
  id: string;
  yourEntity: string;
  defaultGLAccountCode: string;
  paymentTermsOverride: string;
}

interface AuditLog {
  id: string;
  idType: string;
  inputValue: string;
  ocrParsedValue: string;
  systemStatus: 'VALIDATED' | 'FAILED';
}

// Vendor Group Master Data
const vendorGroups = [
  { code: 'VG001', name: 'Tata Group' },
  { code: 'VG002', name: 'Reliance Group' },
  { code: 'VG003', name: 'Aditya Birla Group' },
  { code: 'VG004', name: 'Mahindra Group' },
  { code: 'VG005', name: 'Jindal Group' },
  { code: 'VG006', name: 'Vedanta Group' },
  { code: 'VG007', name: 'Adani Group' },
  { code: 'VG008', name: 'Larsen & Toubro Group' },
  { code: 'VG009', name: 'Wipro Group' },
  { code: 'VG010', name: 'Infosys Group' },
  { code: 'VG011', name: 'HCL Group' },
  { code: 'VG012', name: 'Tech Mahindra Group' },
  { code: 'VG013', name: 'Essar Group' },
  { code: 'VG014', name: 'Bajaj Group' },
  { code: 'VG015', name: 'Independent Vendors' },
];

export function CreateVendor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendorId } = useParams<{ vendorId?: string }>();
  const { addVendor, updateVendor, getVendorById, entities, vendors } = useMasterData();
  const hydratedRef = useRef<string | null>(null);
  const listPath = (location.state as { returnTo?: string } | null)?.returnTo ?? '/vendors';

  // General Details
  const [vendorName, setVendorName] = useState('');
  const [vendorGroup, setVendorGroup] = useState('');
  const [vendorAlias, setVendorAlias] = useState('');
  const [vendorStatus, setVendorStatus] = useState('Active');
  const [vendorType, setVendorType] = useState('Both');
  const [riskCategory, setRiskCategory] = useState('Medium');
  const [internalSPOC, setInternalSPOC] = useState('');

  // Contact Details
  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('');
  const [emailID, setEmailID] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Statutory Compliance
  const [panNumber, setPanNumber] = useState('');
  const [cinNumber, setCinNumber] = useState('');
  const [tdsSections, setTdsSections] = useState('');
  const [section206AB, setSection206AB] = useState(false);
  const [verifiedEntityType, setVerifiedEntityType] = useState('Company (Pvt Ltd / Ltd)');
  const [isMSMERegistered, setIsMSMERegistered] = useState(false);
  const [udyamRegistrationNo, setUdyamRegistrationNo] = useState('');
  const [msmeType, setMsmeType] = useState('Udyam');
  const [msmeClassification, setMsmeClassification] = useState('Small');
  const [frequencyMonths, setFrequencyMonths] = useState(3);
  const [lastValidatedOn, setLastValidatedOn] = useState('');
  const [nextValidationDate, setNextValidationDate] = useState('');

  // GST Details (moved under Statutory)
  const [gstDetails, setGstDetails] = useState<GSTDetail[]>([]);

  // Bank Accounts (moved under Statutory)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Validation Status States
  const [panValidationStatus, setPanValidationStatus] = useState<'PENDING' | 'VALIDATED' | 'FAILED'>('PENDING');
  const [cinValidationStatus, setCinValidationStatus] = useState<'PENDING' | 'VALIDATED' | 'FAILED'>('PENDING');
  const [udyamValidationStatus, setUdyamValidationStatus] = useState<'PENDING' | 'VALIDATED' | 'FAILED'>('PENDING');
  const [gstValidationStatus, setGstValidationStatus] = useState<{ [key: string]: 'PENDING' | 'VALIDATED' | 'FAILED' }>({});
  const [validatingPan, setValidatingPan] = useState(false);
  const [validatingCin, setValidatingCin] = useState(false);
  const [validatingUdyam, setValidatingUdyam] = useState(false);
  const [validatingGst, setValidatingGst] = useState<{ [key: string]: boolean }>({});

  // Financial Mapping
  const [mappedServices, setMappedServices] = useState<string[]>([]);
  const [mappedDepartments, setMappedDepartments] = useState<string[]>([]);
  const [entityMappings, setEntityMappings] = useState<EntityMapping[]>([]);

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);

  // Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Workflow
  const [workflowStatus, setWorkflowStatus] = useState('Draft/Awaiting Submission');
  const [erpVendorCode, setErpVendorCode] = useState('-- Not Synced --');

  useEffect(() => {
    if (!vendorId) {
      hydratedRef.current = null;
      return;
    }
    const v = getVendorById(vendorId);
    if (!v) return;
    if (hydratedRef.current === vendorId) return;
    hydratedRef.current = vendorId;

    setVendorName(v.name);
    setVendorAlias(v.legalName && v.legalName !== v.name ? v.legalName : '');
    setVendorGroup(v.category || '');
    setVendorStatus(
      v.status === 'Blocked' ? 'Blocked' : v.status === 'Inactive' ? 'Inactive' : 'Active'
    );
    setVendorType(v.vendorType === 'Import' ? 'Import' : 'Both');
    setEmailID(v.email);
    setPhoneNumber(v.phone);
    setPanNumber(v.pan);
    setGstDetails(
      v.addresses.length > 0
        ? v.addresses.map((a) => ({
            id: a.id,
            gstin: a.gstin || v.gstin || '',
            registeredState: a.state,
            registrationStatus: 'Active',
            detailedAddress: [a.addressLine1, a.addressLine2].filter(Boolean).join(', ') || a.addressLine1,
          }))
        : v.gstin
          ? [
              {
                id: `gst-${v.id}`,
                gstin: v.gstin,
                registeredState: '',
                registrationStatus: 'Active',
                detailedAddress: '',
              },
            ]
          : []
    );
    setBankAccounts(
      v.bankAccounts.length > 0
        ? v.bankAccounts.map((b) => ({
            id: b.id,
            primary: b.isPrimary,
            accountNumber: b.accountNumber,
            ifscCode: b.ifscCode,
            holderName: b.accountName,
            verificationStatus: b.verified ? 'Validated' : 'Pending',
          }))
        : []
    );
    setIsMSMERegistered(v.msmeRegistered);
    setUdyamRegistrationNo(v.msmeNumber || '');
    if (v.msmeCategory) setMsmeClassification(v.msmeCategory);
    setTdsSections(v.tdsSection || '');
    setSection206AB(Boolean(v.section206ABApplicable));
    setErpVendorCode(v.code);
    if (v.entityName?.trim()) {
      setEntityMappings([
        {
          id: 'em-1',
          yourEntity: v.entityName,
          defaultGLAccountCode: '',
          paymentTermsOverride: v.paymentTerms,
        },
      ]);
    } else {
      setEntityMappings([]);
    }
    setWorkflowStatus(v.approvedBy ? 'Approved' : 'Draft/Awaiting Submission');
    setPanValidationStatus('PENDING');
    setCinValidationStatus('PENDING');
    setUdyamValidationStatus('PENDING');
  }, [vendorId, vendors, getVendorById]);

  // Bank Account Functions
  const handleAddBankAccount = () => {
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      primary: bankAccounts.length === 0,
      accountNumber: '',
      ifscCode: '',
      holderName: '',
      verificationStatus: 'Pending'
    };
    setBankAccounts([...bankAccounts, newAccount]);
  };

  const handleRemoveBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(b => b.id !== id));
  };

  // Document Functions
  const handleAddDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      documentName: '',
      validFrom: '',
      validToExpiry: ''
    };
    setDocuments([...documents, newDoc]);
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  // Entity Mapping Functions
  const handleAddEntityMapping = () => {
    const newMapping: EntityMapping = {
      id: Date.now().toString(),
      yourEntity: '',
      defaultGLAccountCode: '',
      paymentTermsOverride: ''
    };
    setEntityMappings([...entityMappings, newMapping]);
  };

  const handleRemoveEntityMapping = (id: string) => {
    setEntityMappings(entityMappings.filter(e => e.id !== id));
  };

  // Mock API Validation Functions
  const validatePAN = async () => {
    if (!panNumber) {
      alert('Please enter PAN number first');
      return;
    }
    
    setValidatingPan(true);
    
    // Simulate API call to NSDL PAN Verification API
    setTimeout(() => {
      // Mock validation - check if PAN format is correct
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const isValid = panRegex.test(panNumber);
      
      if (isValid) {
        setPanValidationStatus('VALIDATED');
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'PAN',
          inputValue: panNumber,
          ocrParsedValue: panNumber,
          systemStatus: 'VALIDATED'
        };
        setAuditLogs([...auditLogs, log]);
        setLastValidatedOn(new Date().toISOString().split('T')[0]);
      } else {
        setPanValidationStatus('FAILED');
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'PAN',
          inputValue: panNumber,
          ocrParsedValue: 'Invalid Format',
          systemStatus: 'FAILED'
        };
        setAuditLogs([...auditLogs, log]);
      }
      
      setValidatingPan(false);
    }, 1500);
  };

  const validateCIN = async () => {
    if (!cinNumber) {
      alert('Please enter CIN number first');
      return;
    }
    
    setValidatingCin(true);
    
    // Simulate API call to MCA CIN Verification API
    setTimeout(() => {
      // Mock validation - check if CIN format is correct
      const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
      const isValid = cinRegex.test(cinNumber);
      
      if (isValid) {
        setCinValidationStatus('VALIDATED');
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'CIN',
          inputValue: cinNumber,
          ocrParsedValue: cinNumber,
          systemStatus: 'VALIDATED'
        };
        setAuditLogs([...auditLogs, log]);
      } else {
        setCinValidationStatus('FAILED');
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'CIN',
          inputValue: cinNumber,
          ocrParsedValue: 'Invalid Format',
          systemStatus: 'FAILED'
        };
        setAuditLogs([...auditLogs, log]);
      }
      
      setValidatingCin(false);
    }, 1500);
  };

  const validateUdyam = async () => {
    if (!udyamRegistrationNo) {
      alert('Please enter Udyam Registration Number first');
      return;
    }
    
    setValidatingUdyam(true);
    
    // Simulate API call to Udyam Registration Portal API
    setTimeout(() => {
      // Mock validation - check if Udyam format is correct
      const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
      const isValid = udyamRegex.test(udyamRegistrationNo);
      
      if (isValid) {
        setUdyamValidationStatus('VALIDATED');
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'Udyam',
          inputValue: udyamRegistrationNo,
          ocrParsedValue: udyamRegistrationNo,
          systemStatus: 'VALIDATED'
        };
        setAuditLogs([...auditLogs, log]);
      } else {
        setUdyamValidationStatus('FAILED');
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'Udyam',
          inputValue: udyamRegistrationNo,
          ocrParsedValue: 'Invalid Format',
          systemStatus: 'FAILED'
        };
        setAuditLogs([...auditLogs, log]);
      }
      
      setValidatingUdyam(false);
    }, 1500);
  };

  const validateGST = async (gstId: string, gstin: string) => {
    if (!gstin) {
      alert('Please enter GSTIN first');
      return;
    }
    
    setValidatingGst({ ...validatingGst, [gstId]: true });
    
    // Simulate API call to GST API
    setTimeout(() => {
      // Mock validation - check if GSTIN format is correct
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const isValid = gstRegex.test(gstin);
      
      if (isValid) {
        setGstValidationStatus({ ...gstValidationStatus, [gstId]: 'VALIDATED' });
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'GSTIN',
          inputValue: gstin,
          ocrParsedValue: gstin,
          systemStatus: 'VALIDATED'
        };
        setAuditLogs([...auditLogs, log]);
      } else {
        setGstValidationStatus({ ...gstValidationStatus, [gstId]: 'FAILED' });
        const log: AuditLog = {
          id: Date.now().toString(),
          idType: 'GSTIN',
          inputValue: gstin,
          ocrParsedValue: 'Invalid Format',
          systemStatus: 'FAILED'
        };
        setAuditLogs([...auditLogs, log]);
      }
      
      setValidatingGst({ ...validatingGst, [gstId]: false });
    }, 1500);
  };

  const runAllComplianceChecks = async () => {
    setValidatingPan(true);
    setValidatingCin(true);
    setValidatingUdyam(true);
    
    // Run PAN validation
    if (panNumber) {
      setTimeout(() => {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const isValid = panRegex.test(panNumber);
        setPanValidationStatus(isValid ? 'VALIDATED' : 'FAILED');
        setValidatingPan(false);
      }, 1500);
    } else {
      setValidatingPan(false);
    }

    // Run CIN validation
    if (cinNumber) {
      setTimeout(() => {
        const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
        const isValid = cinRegex.test(cinNumber);
        setCinValidationStatus(isValid ? 'VALIDATED' : 'FAILED');
        setValidatingCin(false);
      }, 1500);
    } else {
      setValidatingCin(false);
    }

    // Run Udyam validation
    if (udyamRegistrationNo) {
      setTimeout(() => {
        const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
        const isValid = udyamRegex.test(udyamRegistrationNo);
        setUdyamValidationStatus(isValid ? 'VALIDATED' : 'FAILED');
        setValidatingUdyam(false);
      }, 1500);
    } else {
      setValidatingUdyam(false);
    }

    // Run GST validations
    gstDetails.forEach((gst) => {
      if (gst.gstin) {
        validateGST(gst.id, gst.gstin);
      }
    });

    // Update last validated date
    setTimeout(() => {
      setLastValidatedOn(new Date().toISOString().split('T')[0]);
    }, 2000);
  };

  const handleSubmit = () => {
    const primaryEntity = entities[0];
    const existing = vendorId ? getVendorById(vendorId) : undefined;
    if (vendorId && !existing) {
      alert('Vendor not found.');
      return;
    }

    const newId = `VEN-${Date.now()}`;
    const masterStatus: VendorMaster['status'] =
      vendorStatus === 'Inactive' ? 'Inactive' : vendorStatus === 'Blocked' ? 'Blocked' : 'Active';

    const payload: VendorMaster = {
      id: existing?.id ?? newId,
      code: existing?.code ?? newId,
      name: vendorName || vendorAlias || 'New Vendor',
      legalName: vendorName || vendorAlias || 'New Vendor',
      pan: panNumber,
      gstin: gstDetails[0]?.gstin ?? '',
      email: emailID,
      phone: phoneNumber,
      category: vendorGroup || 'Independent Vendors',
      vendorType: vendorType === 'Import' ? 'Import' : 'Domestic',
      msmeRegistered: isMSMERegistered,
      msmeNumber: udyamRegistrationNo || undefined,
      msmeCategory: isMSMERegistered ? (msmeClassification as 'Micro' | 'Small' | 'Medium') : undefined,
      status: masterStatus,
      paymentTerms: entityMappings[0]?.paymentTermsOverride || existing?.paymentTerms || 'Net 30',
      creditDays: existing?.creditDays ?? 30,
      bankAccounts: bankAccounts.map((bank) => ({
        id: bank.id,
        accountNumber: bank.accountNumber,
        accountName: bank.holderName,
        ifscCode: bank.ifscCode,
        bankName: existing?.bankAccounts.find((b) => b.id === bank.id)?.bankName ?? 'Bank',
        branchName: existing?.bankAccounts.find((b) => b.id === bank.id)?.branchName ?? '',
        accountType: 'Current',
        isPrimary: bank.primary,
        verified: bank.verificationStatus === 'Validated',
        verifiedDate: bank.verificationStatus === 'Validated' ? new Date().toISOString().split('T')[0] : undefined,
      })),
      addresses: gstDetails.map((gst) => ({
        id: gst.id,
        type: 'Registered',
        addressLine1: gst.detailedAddress || '',
        city: gst.registeredState || '',
        state: gst.registeredState || '',
        stateCode: existing?.addresses.find((a) => a.id === gst.id)?.stateCode ?? '',
        pincode: existing?.addresses.find((a) => a.id === gst.id)?.pincode ?? '',
        country: existing?.addresses.find((a) => a.id === gst.id)?.country ?? 'India',
        gstin: gst.gstin,
        isPrimary: true,
      })),
      createdBy: existing?.createdBy ?? (internalSPOC || 'System'),
      createdDate: existing?.createdDate ?? new Date().toISOString().split('T')[0],
      approvedBy:
        workflowStatus === 'Approved' ? internalSPOC || existing?.approvedBy || 'System' : existing?.approvedBy,
      approvedDate:
        workflowStatus === 'Approved'
          ? existing?.approvedDate ?? new Date().toISOString().split('T')[0]
          : existing?.approvedDate,
      entityId: existing?.entityId ?? primaryEntity?.id,
      entityName: existing?.entityName ?? primaryEntity?.name,
      country: existing?.country ?? primaryEntity?.country ?? 'India',
      currency: existing?.currency ?? primaryEntity?.currency ?? 'INR',
      vatRegistrationNumber: existing?.vatRegistrationNumber,
      tdsApplicable: Boolean(tdsSections),
      tdsSection: tdsSections || undefined,
      lowerTdsApplicable: existing?.lowerTdsApplicable,
      lowerTdsRate: existing?.lowerTdsRate,
      lowerTdsReference: existing?.lowerTdsReference,
      section206ABApplicable: existing?.section206ABApplicable,
      effectiveTdsRate: existing?.effectiveTdsRate,
    };

    if (existing) {
      updateVendor(payload);
    } else {
      addVendor(payload);
    }
    navigate(listPath);
  };

  if (vendorId && vendors.length > 0 && !getVendorById(vendorId)) {
    return (
      <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100%' }}>
        <p className="text-sm mb-4" style={{ color: '#6E7A82' }}>
          This vendor could not be found.
        </p>
        <button
          type="button"
          onClick={() => navigate(listPath)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#00A9B7' }}
        >
          Back to list
        </button>
      </div>
    );
  }

  const isEditMode = Boolean(vendorId);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl" style={{ color: '#0A0F14' }}>
            {isEditMode ? 'Edit Vendor Master' : 'Create Vendor Master'}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#00A9B7' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#007D87';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#00A9B7';
          }}
        >
          {isEditMode ? 'Save changes' : 'Submit Vendor'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Section 1: General Details */}
        <div className="bg-white rounded-lg p-6 space-y-6" style={{ border: '1px solid #E1E6EA' }}>
          <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>General Details</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Name <span style={{ color: '#FF4E5B' }}>*</span>
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Enter vendor name"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Group
              </label>
              <select
                value={vendorGroup}
                onChange={(e) => setVendorGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              >
                <option value="">-- Select Vendor Group --</option>
                {vendorGroups.map(group => (
                  <option key={group.code} value={`${group.code} - ${group.name}`}>
                    {group.code} - {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Alias
              </label>
              <input
                type="text"
                value={vendorAlias}
                onChange={(e) => setVendorAlias(e.target.value)}
                placeholder="Enter alias"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Status
              </label>
              <select
                value={vendorStatus}
                onChange={(e) => setVendorStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              >
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending Approval</option>
                <option>Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Vendor Type
              </label>
              <select
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              >
                <option>Both</option>
                <option>Goods</option>
                <option>Services</option>
                <option>Import</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Risk Category
              </label>
              <select
                value={riskCategory}
                onChange={(e) => setRiskCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Internal SPOC
              </label>
              <input
                type="text"
                value={internalSPOC}
                onChange={(e) => setInternalSPOC(e.target.value)}
                placeholder="e.g., John Doe (Procurement)"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white rounded-lg p-6 space-y-6" style={{ border: '1px solid #E1E6EA' }}>
          <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Contact Details</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Contact Person <span style={{ color: '#FF4E5B' }}>*</span>
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Enter contact person name"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g., Head of Sales"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Email ID <span style={{ color: '#FF4E5B' }}>*</span>
              </label>
              <input
                type="email"
                value={emailID}
                onChange={(e) => setEmailID(e.target.value)}
                placeholder="contact@vendor.com"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Phone Number <span style={{ color: '#FF4E5B' }}>*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Statutory Compliance & Audit */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Main Form - 2 columns */}
          <div className="col-span-2 bg-white rounded-lg p-6 space-y-6" style={{ border: '1px solid #E1E6EA' }}>
            <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Statutory Compliance & Audit</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                PAN Number <span style={{ color: '#FF4E5B' }}>*</span>
              </label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="ABCDE1234E"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
              <button
                onClick={validatePAN}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                {validatingPan ? (
                  <Calendar className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {panValidationStatus === 'PENDING' ? 'Validate PAN' : panValidationStatus}
              </button>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                CIN Number
              </label>
              <input
                type="text"
                value={cinNumber}
                onChange={(e) => setCinNumber(e.target.value)}
                placeholder="U21090RJ2002PTC017849"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
              <button
                onClick={validateCIN}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                {validatingCin ? (
                  <Calendar className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {cinValidationStatus === 'PENDING' ? 'Validate CIN' : cinValidationStatus}
              </button>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Verified Entity Type
              </label>
              <select
                value={verifiedEntityType}
                onChange={(e) => setVerifiedEntityType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              >
                <option>Company (Pvt Ltd / Ltd)</option>
                <option>Partnership</option>
                <option>Proprietorship</option>
                <option>LLP</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isMSMERegistered}
                onChange={(e) => setIsMSMERegistered(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: '#00A9B7' }}
              />
              <label className="text-sm" style={{ color: '#0A0F14' }}>
                Is MSME Registered?
              </label>
            </div>
          </div>

          {isMSMERegistered && (
            <div className="grid grid-cols-2 gap-6 p-4 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Udyam Registration No
                </label>
                <input
                  type="text"
                  value={udyamRegistrationNo}
                  onChange={(e) => setUdyamRegistrationNo(e.target.value)}
                  placeholder="UDYAM-MH-01-0000001"
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    border: '1px solid #E1E6EA',
                    backgroundColor: 'white',
                    color: '#0A0F14'
                  }}
                />
                <button
                  onClick={validateUdyam}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                  style={{ backgroundColor: '#00A9B7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
                >
                  {validatingUdyam ? (
                    <Calendar className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {udyamValidationStatus === 'PENDING' ? 'Validate Udyam' : udyamValidationStatus}
                </button>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  MSME Type
                </label>
                <select
                  value={msmeType}
                  onChange={(e) => setMsmeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    border: '1px solid #E1E6EA',
                    backgroundColor: 'white',
                    color: '#0A0F14'
                  }}
                >
                  <option>Udyam</option>
                  <option>UAM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  MSME Classification
                </label>
                <select
                  value={msmeClassification}
                  onChange={(e) => setMsmeClassification(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    border: '1px solid #E1E6EA',
                    backgroundColor: 'white',
                    color: '#0A0F14'
                  }}
                >
                  <option>Micro</option>
                  <option>Small</option>
                  <option>Medium</option>
                </select>
              </div>
            </div>
          )}

          {/* TDS Section */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                TDS Sections (e.g., 194C, 194J)
              </label>
              <input
                type="text"
                value={tdsSections}
                onChange={(e) => setTdsSections(e.target.value)}
                placeholder="194C, 194J"
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={section206AB}
                onChange={(e) => setSection206AB(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: '#00A9B7' }}
              />
              <label className="text-sm" style={{ color: '#0A0F14' }}>
                Section 206AB Applicable (Higher TDS Rate)
              </label>
            </div>
          </div>

          {/* GST Details */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ color: '#0A0F14' }}>GST Details</h3>
              <button
                onClick={() => {
                  const newGST: GSTDetail = {
                    id: Date.now().toString(),
                    gstin: '',
                    registeredState: '',
                    registrationStatus: 'Active',
                    detailedAddress: ''
                  };
                  setGstDetails([...gstDetails, newGST]);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                <Plus className="w-4 h-4" />
                Add GST Registration
              </button>
            </div>

            {gstDetails.length === 0 ? (
              <div 
                className="text-center py-8 rounded-lg"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <p style={{ color: '#6E7A82' }}>
                  No GST registrations added.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {gstDetails.map((gst) => (
                  <div
                    key={gst.id}
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                  >
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          GSTIN
                        </label>
                        <input
                          type="text"
                          value={gst.gstin}
                          onChange={(e) => {
                            setGstDetails(gstDetails.map(g => 
                              g.id === gst.id ? { ...g, gstin: e.target.value } : g
                            ));
                          }}
                          placeholder="29ABCDE1234F1Z5"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                        <button
                          onClick={() => validateGST(gst.id, gst.gstin)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                          style={{ backgroundColor: '#00A9B7' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
                        >
                          {validatingGst[gst.id] ? (
                            <Calendar className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {gstValidationStatus[gst.id] === 'PENDING' ? 'Validate GSTIN' : gstValidationStatus[gst.id]}
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Registered State
                        </label>
                        <input
                          type="text"
                          value={gst.registeredState}
                          onChange={(e) => {
                            setGstDetails(gstDetails.map(g => 
                              g.id === gst.id ? { ...g, registeredState: e.target.value } : g
                            ));
                          }}
                          placeholder="Karnataka"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Registration Status
                        </label>
                        <select
                          value={gst.registrationStatus}
                          onChange={(e) => {
                            setGstDetails(gstDetails.map(g => 
                              g.id === gst.id ? { ...g, registrationStatus: e.target.value } : g
                            ));
                          }}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        >
                          <option>Active</option>
                          <option>Cancelled</option>
                          <option>Suspended</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Detailed Address
                        </label>
                        <input
                          type="text"
                          value={gst.detailedAddress}
                          onChange={(e) => {
                            setGstDetails(gstDetails.map(g => 
                              g.id === gst.id ? { ...g, detailedAddress: e.target.value } : g
                            ));
                          }}
                          placeholder="Registered address"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => setGstDetails(gstDetails.filter(g => g.id !== gst.id))}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#FF4E5B' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bank Accounts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ color: '#0A0F14' }}>Bank Accounts</h3>
              <button
                onClick={handleAddBankAccount}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                <Plus className="w-4 h-4" />
                Add Bank Account
              </button>
            </div>

            {bankAccounts.length === 0 ? (
              <div 
                className="text-center py-8 rounded-lg"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <p style={{ color: '#6E7A82' }}>
                  No bank accounts added.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                  >
                    <div className="grid grid-cols-5 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={bank.primary}
                          onChange={(e) => {
                            setBankAccounts(bankAccounts.map(b => ({
                              ...b,
                              primary: b.id === bank.id ? e.target.checked : false
                            })));
                          }}
                          className="w-4 h-4 mr-2"
                          style={{ accentColor: '#00A9B7' }}
                        />
                        <label className="text-sm" style={{ color: '#0A0F14' }}>Primary</label>
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={bank.accountNumber}
                          onChange={(e) => {
                            setBankAccounts(bankAccounts.map(b => 
                              b.id === bank.id ? { ...b, accountNumber: e.target.value } : b
                            ));
                          }}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={bank.ifscCode}
                          onChange={(e) => {
                            setBankAccounts(bankAccounts.map(b => 
                              b.id === bank.id ? { ...b, ifscCode: e.target.value } : b
                            ));
                          }}
                          placeholder="HDFC0000087"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Holder Name
                        </label>
                        <input
                          type="text"
                          value={bank.holderName}
                          onChange={(e) => {
                            setBankAccounts(bankAccounts.map(b => 
                              b.id === bank.id ? { ...b, holderName: e.target.value } : b
                            ));
                          }}
                          placeholder="Account holder name"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveBankAccount(bank.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#FF4E5B' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validation Schedule */}
          <div>
            <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Validation Schedule</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Frequency (Months)
                </label>
                <input
                  type="number"
                  value={frequencyMonths}
                  onChange={(e) => setFrequencyMonths(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    border: '1px solid #E1E6EA',
                    backgroundColor: 'white',
                    color: '#0A0F14'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Last Validated On
                </label>
                <input
                  type="date"
                  value={lastValidatedOn}
                  onChange={(e) => setLastValidatedOn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    border: '1px solid #E1E6EA',
                    backgroundColor: 'white',
                    color: '#0A0F14'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Next Validation Date
                </label>
                <input
                  type="date"
                  value={nextValidationDate}
                  onChange={(e) => setNextValidationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    border: '1px solid #E1E6EA',
                    backgroundColor: 'white',
                    color: '#0A0F14'
                  }}
                />
              </div>
            </div>
          </div>
          </div>

          {/* Right: Compliance Validation Summary - 1 column */}
          <div className="col-span-1">
            <ComplianceValidationSummary
              panValidationStatus={panValidationStatus}
              cinValidationStatus={cinValidationStatus}
              udyamValidationStatus={udyamValidationStatus}
              gstValidationStatus={gstValidationStatus}
              section206AB={section206AB}
              gstDetails={gstDetails}
              bankAccounts={bankAccounts}
              lastValidatedOn={lastValidatedOn}
              onRunAllChecks={runAllComplianceChecks}
              validating={validatingPan || validatingCin || validatingUdyam}
              panNumber={panNumber}
              cinNumber={cinNumber}
              udyamRegistrationNo={udyamRegistrationNo}
            />
          </div>
        </div>

        {/* Section 4: Financial Mapping & Accounts */}
        <div className="bg-white rounded-lg p-6 space-y-6" style={{ border: '1px solid #E1E6EA' }}>
          <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Financial Mapping & Accounts</h2>
          
          {/* Mapped Services */}
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Mapped Services (Comma separated)
            </label>
            <input
              type="text"
              value={mappedServices.join(', ')}
              onChange={(e) => setMappedServices(e.target.value.split(',').map(s => s.trim()))}
              placeholder="e.g., Consulting, Apparel Production"
              className="w-full px-3 py-2 rounded-lg"
              style={{
                border: '1px solid #E1E6EA',
                backgroundColor: 'white',
                color: '#0A0F14'
              }}
            />
          </div>

          {/* Mapped Departments */}
          <div>
            <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
              Mapped Departments (Comma separated)
            </label>
            <input
              type="text"
              value={mappedDepartments.join(', ')}
              onChange={(e) => setMappedDepartments(e.target.value.split(',').map(d => d.trim()))}
              placeholder="e.g., Finance, Production"
              className="w-full px-3 py-2 rounded-lg"
              style={{
                border: '1px solid #E1E6EA',
                backgroundColor: 'white',
                color: '#0A0F14'
              }}
            />
          </div>

          {/* Entity Account Mapping */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ color: '#0A0F14' }}>Entity Account Mapping</h3>
              <button
                onClick={handleAddEntityMapping}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors text-sm"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
              >
                <Plus className="w-4 h-4" />
                Add Mapping
              </button>
            </div>

            {entityMappings.length === 0 ? (
              <div 
                className="text-center py-8 rounded-lg"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <p style={{ color: '#6E7A82' }}>
                  No entity mappings added.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {entityMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                  >
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Your Entity
                        </label>
                        <input
                          type="text"
                          value={mapping.yourEntity}
                          onChange={(e) => {
                            setEntityMappings(entityMappings.map(m => 
                              m.id === mapping.id ? { ...m, yourEntity: e.target.value } : m
                            ));
                          }}
                          placeholder="e.g., IND"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Default GL Account Code
                        </label>
                        <input
                          type="text"
                          value={mapping.defaultGLAccountCode}
                          onChange={(e) => {
                            setEntityMappings(entityMappings.map(m => 
                              m.id === mapping.id ? { ...m, defaultGLAccountCode: e.target.value } : m
                            ));
                          }}
                          placeholder="211005 (AP-Trade)"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Payment Terms Override
                        </label>
                        <input
                          type="text"
                          value={mapping.paymentTermsOverride}
                          onChange={(e) => {
                            setEntityMappings(entityMappings.map(m => 
                              m.id === mapping.id ? { ...m, paymentTermsOverride: e.target.value } : m
                            ));
                          }}
                          placeholder="Net 30"
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveEntityMapping(mapping.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#FF4E5B' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Document Validity */}
        <div className="bg-white rounded-lg p-6 space-y-6" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl" style={{ color: '#0A0F14' }}>Document Validity</h2>
            <button
              onClick={handleAddDocument}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#00A9B7' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
            >
              <Plus className="w-4 h-4" />
              Add Document
            </button>
          </div>

          {documents.length === 0 ? (
            <div 
              className="text-center py-8 rounded-lg"
              style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
            >
              <p style={{ color: '#6E7A82' }}>
                No documents added. Click "Add Document" to track validity dates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                >
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                        Document Name
                      </label>
                      <input
                        type="text"
                        value={doc.documentName}
                        onChange={(e) => {
                          setDocuments(documents.map(d => 
                            d.id === doc.id ? { ...d, documentName: e.target.value } : d
                          ));
                        }}
                        placeholder="e.g., NDA Agreement"
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid #E1E6EA',
                          backgroundColor: 'white',
                          color: '#0A0F14'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                        Valid From
                      </label>
                      <input
                        type="date"
                        value={doc.validFrom}
                        onChange={(e) => {
                          setDocuments(documents.map(d => 
                            d.id === doc.id ? { ...d, validFrom: e.target.value } : d
                          ));
                        }}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid #E1E6EA',
                          backgroundColor: 'white',
                          color: '#0A0F14'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                        Valid To (Expiry)
                      </label>
                      <input
                        type="date"
                        value={doc.validToExpiry}
                        onChange={(e) => {
                          setDocuments(documents.map(d => 
                            d.id === doc.id ? { ...d, validToExpiry: e.target.value } : d
                          ));
                        }}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1px solid #E1E6EA',
                          backgroundColor: 'white',
                          color: '#0A0F14'
                        }}
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#FF4E5B' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Workflow Details */}
        <div className="bg-white rounded-lg p-6 space-y-6" style={{ border: '1px solid #E1E6EA' }}>
          <h2 className="text-xl mb-4" style={{ color: '#0A0F14' }}>Workflow Details</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                Workflow Status
              </label>
              <select
                value={workflowStatus}
                onChange={(e) => setWorkflowStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: 'white',
                  color: '#0A0F14'
                }}
              >
                <option>Draft/Awaiting Submission</option>
                <option>Pending Approval</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                ERP Vendor Code
              </label>
              <input
                type="text"
                value={erpVendorCode}
                onChange={(e) => setErpVendorCode(e.target.value)}
                placeholder="-- Not Synced --"
                disabled
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  border: '1px solid #E1E6EA',
                  backgroundColor: '#F6F9FC',
                  color: '#6E7A82'
                }}
              />
            </div>
          </div>

          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FFF3E0', border: '1px solid #FF9800' }}
          >
            <p className="text-sm" style={{ color: '#FF9800' }}>
              ℹ️ ERP Vendor Code will be auto-generated once the vendor is approved and synced to ERP system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
