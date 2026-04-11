import { ArrowLeft, Plus, Trash2, X, Hash, User, Mail, Phone, Briefcase, FileText, Upload, Edit, Eye, Search, ArrowUpRight, Building2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback } from 'react';
import { ApprovalModal } from './ApprovalModal';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { applyMasterApprovalAction } from '../lib/masters/masterScreenApproval';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';
import { FormShell, FormSection, PxFormField, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';

interface Employee {
  id: string;
  empCode: string;
  empName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  baseEntity: string;
  baseLocation: string;
  reportingManager: string;
  costCenter?: string;
  profitCenter?: string;
  status: string;
  defaultFunctionalContext: string;
  profilePic?: string;
  approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  originalData?: Employee; // Store original data for change tracking
}

interface Change {
  field: string;
  oldValue: string;
  newValue: string;
}

export function EmployeeMaster() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { entities, costCentres, profitCentres, departments } = useMasterData();
  const [employees, setEmployees, isHydrating, persistEmployees] = useIncrementalMasterRecords<Employee>('employee_master', [
    { id: '1', empCode: 'EMP001', empName: 'Rajesh Kumar', email: 'rajesh.kumar@procinix.ai', phone: '+91 98765 43210', department: 'Procurement', designation: 'Procurement Manager', baseEntity: 'Subko Coffee Private Limited', baseLocation: 'Mumbai HQ', reportingManager: 'CFO Office', costCenter: 'CC-PROC-001', profitCenter: 'PC-HQ-001', status: 'Active', defaultFunctionalContext: 'Procurement Desk', approvalStatus: 'Approved' },
    { id: '2', empCode: 'EMP002', empName: 'Priya Sharma', email: 'priya.sharma@procinix.ai', phone: '+91 98765 43211', department: 'Finance', designation: 'Finance Manager', baseEntity: 'Subko Coffee Private Limited', baseLocation: 'Mumbai HQ', reportingManager: 'CFO Office', costCenter: 'CC-FIN-001', profitCenter: 'PC-HQ-001', status: 'Active', defaultFunctionalContext: 'Accounts Payable', approvalStatus: 'Approved' },
    { id: '3', empCode: 'EMP003', empName: 'Amit Patel', email: 'amit.patel@procinix.ai', phone: '+91 98765 43212', department: 'Warehouse', designation: 'Warehouse Supervisor', baseEntity: 'Subko Coffee Private Limited', baseLocation: 'Bengaluru Warehouse', reportingManager: 'Operations Head', costCenter: 'CC-WH-001', profitCenter: 'PC-SUPPLY-001', status: 'Active', defaultFunctionalContext: 'GRN / SRN', approvalStatus: 'Approved' },
    { id: '4', empCode: 'EMP004', empName: 'Sneha Verma', email: 'sneha.verma@procinix.ai', phone: '+91 98765 43213', department: 'Quality', designation: 'Quality Analyst', baseEntity: 'Subko Coffee Private Limited', baseLocation: 'Mumbai Roastery', reportingManager: 'Operations Head', costCenter: 'CC-QA-001', profitCenter: 'PC-OPS-001', status: 'Inactive', defaultFunctionalContext: 'Quality Review', approvalStatus: 'Approved' },
    { id: '5', empCode: 'EMP005', empName: 'Vikram Singh', email: 'vikram.singh@procinix.ai', phone: '+91 98765 43214', department: 'Procurement', designation: 'Buyer', baseEntity: 'Subko Coffee Private Limited', baseLocation: 'Delhi Branch', reportingManager: 'Rajesh Kumar', costCenter: 'CC-PROC-002', profitCenter: 'PC-NORTH-001', status: 'Active', defaultFunctionalContext: 'Purchase Requisition', approvalStatus: 'Pending Approval' }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [baseEntity, setBaseEntity] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [reportingManager, setReportingManager] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [profitCenter, setProfitCenter] = useState('');
  const [status, setStatus] = useState('Active');
  const [defaultFunctionalContext, setDefaultFunctionalContext] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentReviewRecord, setCurrentReviewRecord] = useState<Employee | null>(null);
  const [detectedChanges, setDetectedChanges] = useState<Change[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string[]>([]);

  const sortedEmployees = useMemo(() => {
    const extractCodeNumber = (value: string) => {
      const match = value.match(/(\d+)/);
      return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    };

    return [...employees].sort((left, right) => {
      const numericDiff = extractCodeNumber(left.empCode) - extractCodeNumber(right.empCode);
      if (numericDiff !== 0) {
        return numericDiff;
      }

      const codeDiff = left.empCode.localeCompare(right.empCode, undefined, { sensitivity: 'base' });
      if (codeDiff !== 0) {
        return codeDiff;
      }

      return left.empName.localeCompare(right.empName, undefined, { sensitivity: 'base' });
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return sortedEmployees.filter((employee) => {
      const haystack = [
        employee.empCode,
        employee.empName,
        employee.email,
        employee.phone,
        employee.department,
        employee.designation,
        employee.baseEntity,
        employee.baseLocation,
        employee.reportingManager,
        employee.costCenter || '',
        employee.profitCenter || '',
        employee.defaultFunctionalContext,
      ].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter.length === 0 || departmentFilter.includes(employee.department);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(employee.status);
      const matchesApproval = approvalFilter.length === 0 || approvalFilter.includes(employee.approvalStatus);
      return matchesSearch && matchesDepartment && matchesStatus && matchesApproval;
    });
  }, [sortedEmployees, searchTerm, departmentFilter, statusFilter, approvalFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    departmentFilter.length > 0 ||
    statusFilter.length > 0 ||
    approvalFilter.length > 0;

  const entityOptions = useMemo(() => entities.filter((entity) => entity.isActive).map((entity) => entity.name), [entities]);
  const departmentOptions = useMemo(() => {
    const liveDepartments = departments.map((item: any) => item.name || item.departmentName || item.department || '').filter(Boolean);
    return [...new Set([...liveDepartments, ...sortedEmployees.map((employee) => employee.department)])];
  }, [departments, sortedEmployees]);
  const costCenterOptions = useMemo(() => {
    const liveCostCentres = costCentres.map((item: any) => item.code || item.name || '').filter(Boolean);
    return [...new Set([...liveCostCentres, ...sortedEmployees.map((employee) => employee.costCenter || '').filter(Boolean)])];
  }, [costCentres, sortedEmployees]);
  const profitCenterOptions = useMemo(() => {
    const liveProfitCentres = profitCentres.map((item: any) => item.code || item.name || '').filter(Boolean);
    return [...new Set([...liveProfitCentres, ...sortedEmployees.map((employee) => employee.profitCenter || '').filter(Boolean)])];
  }, [profitCentres, sortedEmployees]);
  const managerOptions = useMemo(() => [...new Set(sortedEmployees.map((employee) => employee.empName))], [sortedEmployees]);
  const locationOptions = useMemo(() => [...new Set([
    'Mumbai HQ',
    'Mumbai Roastery',
    'Bengaluru Warehouse',
    'Delhi Branch',
    ...entityOptions,
    ...sortedEmployees.map((employee) => employee.baseLocation),
  ])], [entityOptions, sortedEmployees]);
  const functionalContextOptions = useMemo(() => [...new Set([
    'Chanakya Desk',
    'Procurement Desk',
    'Purchase Requisition',
    'Purchase Orders',
    'GRN / SRN',
    'Accounts Payable',
    'Vendor Advances',
    'Debit Notes',
    'Payments',
    'Quality Review',
    ...sortedEmployees.map((employee) => employee.defaultFunctionalContext),
  ])], [sortedEmployees]);

  const handleSubmit = async (approvalStatus: Employee['approvalStatus'] = 'Pending Approval') => {
    if (!empCode || !empName || !email || !phone || !department || !designation || !baseEntity || !baseLocation || !reportingManager || !defaultFunctionalContext) {
      alert('Please fill all required employee fields before saving.');
      return;
    }

    if (!isEditMode && employees.some((employee) => employee.empCode.trim().toLowerCase() === empCode.trim().toLowerCase())) {
      alert(`Employee code ${empCode} already exists.`);
      return;
    }

    if (!isEditMode && employees.some((employee) => employee.email.trim().toLowerCase() === email.trim().toLowerCase())) {
      alert(`Employee email ${email} already exists.`);
      return;
    }

    let nextEmployees: Employee[];
    if (isEditMode && editingId) {
      // Update existing record with pending approval status
      const originalRecord = employees.find(e => e.id === editingId);
      
      const updatedEmployee: Employee = {
        id: editingId,
        empCode,
        empName,
        email,
        phone,
        department,
        designation,
        baseEntity,
        baseLocation,
        reportingManager,
        costCenter: costCenter || undefined,
        profitCenter: profitCenter || undefined,
        status,
        defaultFunctionalContext,
        profilePic: profilePic || undefined,
        approvalStatus,
        originalData: originalRecord // Keep original data for comparison
      };
      
      nextEmployees = employees.map(e => e.id === editingId ? updatedEmployee : e);
    } else {
      // Create new record with draft status
      const newEmployee: Employee = {
        id: Date.now().toString(),
        empCode,
        empName,
        email,
        phone,
        department,
        designation,
        baseEntity,
        baseLocation,
        reportingManager,
        costCenter: costCenter || undefined,
        profitCenter: profitCenter || undefined,
        status,
        defaultFunctionalContext,
        profilePic: profilePic || undefined,
        approvalStatus
      };
      nextEmployees = [...employees, newEmployee];
    }

    setEmployees(nextEmployees);
    const persisted = await persistEmployees(nextEmployees);
    if (!persisted) {
      alert('Employee record could not be saved to the database. Please try again.');
      return;
    }

    setShowForm(false);
    resetForm();
    window.setTimeout(() => {
      refreshSession();
    }, 300);
  };

  const resetForm = () => {
    setEmpCode('');
    setEmpName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setDesignation('');
    setBaseEntity(entities.find((entity) => entity.isActive)?.name || '');
    setBaseLocation('');
    setReportingManager('');
    setCostCenter('');
    setProfitCenter('');
    setStatus('Active');
    setDefaultFunctionalContext('');
    setProfilePic(null);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (employee: Employee) => {
    setIsEditMode(true);
    setEditingId(employee.id);
    setEmpCode(employee.empCode);
    setEmpName(employee.empName);
    setEmail(employee.email);
    setPhone(employee.phone);
    setDepartment(employee.department);
    setDesignation(employee.designation || '');
    setBaseEntity(employee.baseEntity || '');
    setBaseLocation(employee.baseLocation || '');
    setReportingManager(employee.reportingManager || '');
    setCostCenter(employee.costCenter || '');
    setProfitCenter(employee.profitCenter || '');
    setStatus(employee.status);
    setDefaultFunctionalContext(employee.defaultFunctionalContext || '');
    setProfilePic(employee.profilePic || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const employee = employees.find(e => e.id === id);
    
    if (employee?.approvalStatus === 'Approved') {
      alert('Cannot delete approved/live records. You can only modify them through the approval workflow.');
      return;
    }
    
    setEmployees(employees.filter(e => e.id !== id));
  };

  const handleReview = (employee: Employee) => {
    const changes: Change[] = [];
    
    if (employee.originalData) {
      // Compare with original data
      const original = employee.originalData;
      
      if (original.empCode !== employee.empCode) {
        changes.push({ field: 'Employee Code', oldValue: original.empCode, newValue: employee.empCode });
      }
      if (original.empName !== employee.empName) {
        changes.push({ field: 'Employee Name', oldValue: original.empName, newValue: employee.empName });
      }
      if (original.email !== employee.email) {
        changes.push({ field: 'Email', oldValue: original.email, newValue: employee.email });
      }
      if (original.phone !== employee.phone) {
        changes.push({ field: 'Phone', oldValue: original.phone, newValue: employee.phone });
      }
      if (original.department !== employee.department) {
        changes.push({ field: 'Department', oldValue: original.department, newValue: employee.department });
      }
      if ((original.designation || '') !== (employee.designation || '')) {
        changes.push({ field: 'Designation', oldValue: original.designation || '-', newValue: employee.designation || '-' });
      }
      if ((original.baseEntity || '') !== (employee.baseEntity || '')) {
        changes.push({ field: 'Base Entity', oldValue: original.baseEntity || '-', newValue: employee.baseEntity || '-' });
      }
      if ((original.baseLocation || '') !== (employee.baseLocation || '')) {
        changes.push({ field: 'Base Location / Branch', oldValue: original.baseLocation || '-', newValue: employee.baseLocation || '-' });
      }
      if ((original.reportingManager || '') !== (employee.reportingManager || '')) {
        changes.push({ field: 'Reporting Manager', oldValue: original.reportingManager || '-', newValue: employee.reportingManager || '-' });
      }
      if ((original.costCenter || '') !== (employee.costCenter || '')) {
        changes.push({ field: 'Cost Center', oldValue: original.costCenter || '-', newValue: employee.costCenter || '-' });
      }
      if ((original.profitCenter || '') !== (employee.profitCenter || '')) {
        changes.push({ field: 'Profit Center', oldValue: original.profitCenter || '-', newValue: employee.profitCenter || '-' });
      }
      if ((original.defaultFunctionalContext || '') !== (employee.defaultFunctionalContext || '')) {
        changes.push({ field: 'Default Functional Context', oldValue: original.defaultFunctionalContext || '-', newValue: employee.defaultFunctionalContext || '-' });
      }
      if (original.status !== employee.status) {
        changes.push({ field: 'Status', oldValue: original.status, newValue: employee.status });
      }
    }
    
    setCurrentReviewRecord(employee);
    setDetectedChanges(changes);
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('employee_master', employees, currentReviewRecord.id, 'approve');
      setEmployees(nextRecords);
      window.setTimeout(() => {
        refreshSession();
      }, 300);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleReject = async () => {
    if (currentReviewRecord) {
      const nextRecords = await applyMasterApprovalAction('employee_master', employees, currentReviewRecord.id, 'reject');
      setEmployees(nextRecords);
      window.setTimeout(() => {
        refreshSession();
      }, 300);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const handleRequestInfo = async () => {
    if (currentReviewRecord) {
      const comments = window.prompt('Enter comments for the request:', '');
      if (comments === null) {
        return;
      }
      const nextRecords = await applyMasterApprovalAction('employee_master', employees, currentReviewRecord.id, 'request_info', comments);
      setEmployees(nextRecords);
      window.setTimeout(() => {
        refreshSession();
      }, 300);
    }
    setShowApprovalModal(false);
    setCurrentReviewRecord(null);
  };

  const getStatusBadgeStyle = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'Approved':
        return { backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' };
      case 'Pending Approval':
        return { backgroundColor: '#FFF9E6', color: '#D97706' };
      case 'Draft':
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
      case 'Rejected':
        return { backgroundColor: '#FFE8EA', color: 'var(--color-error)' };
      default:
        return { backgroundColor: '#E5E7EB', color: 'var(--color-mercury-grey)' };
    }
  };

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [empCode, empName, email, phone, department, designation, baseEntity, baseLocation, reportingManager, defaultFunctionalContext, status];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    return { filled, total: fields.length };
  }, [empCode, empName, email, phone, department, designation, baseEntity, baseLocation, reportingManager, defaultFunctionalContext, status]);

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit('Draft');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(handleSaveDraft);

  return (
    showForm ? (
      <FormShell
        title="Employee Master"
        subtitle="Manage employee details with approval workflow"
        modeLabel={isEditMode ? 'Edit Employee' : 'Create Employee'}
        draftStatus={isEditMode ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
        onSaveDraft={handleSaveDraft}
        onSubmit={() => handleSubmit('Pending Approval')}
        submitLabel="Submit"
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        <FormSection title="Personal Details" columns={2}>
          <PxFormField label="Employee Code" required filled={!!empCode.trim()} hint="Unique employee identifier">
            <input type="text" value={empCode} onChange={(e) => setEmpCode(e.target.value)} placeholder="EMP006" className="px-input" />
          </PxFormField>
          <PxFormField label="Employee Name" required filled={!!empName.trim()}>
            <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Full name" className="px-input" />
          </PxFormField>
          <PxFormField label="Email" required filled={!!email.trim()}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" className="px-input" />
          </PxFormField>
          <PxFormField label="Phone" required filled={!!phone.trim()}>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 xxxxx xxxxx" className="px-input" />
          </PxFormField>
        </FormSection>

        <FormSection title="Organization" columns={2}>
          <PxFormField label="Department" required filled={!!department}>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="px-select">
              <option value="">Select department</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Designation" required filled={!!designation.trim()}>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Finance Manager" className="px-input" />
          </PxFormField>
          <PxFormField label="Base Entity" required filled={!!baseEntity}>
            <select value={baseEntity} onChange={(e) => setBaseEntity(e.target.value)} className="px-select">
              <option value="">Select entity</option>
              {entityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Base Location / Branch" required filled={!!baseLocation.trim()}>
            <input
              list="employee-base-locations"
              type="text"
              value={baseLocation}
              onChange={(e) => setBaseLocation(e.target.value)}
              placeholder="Mumbai HQ"
              className="px-input"
            />
            <datalist id="employee-base-locations">
              {locationOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </PxFormField>
          <PxFormField label="Reporting Manager" required filled={!!reportingManager.trim()}>
            <input
              list="employee-reporting-managers"
              type="text"
              value={reportingManager}
              onChange={(e) => setReportingManager(e.target.value)}
              placeholder="Select or type manager"
              className="px-input"
            />
            <datalist id="employee-reporting-managers">
              {managerOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </PxFormField>
          <PxFormField label="Cost Center" filled={!!costCenter}>
            <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="px-select">
              <option value="">Select cost center</option>
              {costCenterOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Profit Center" filled={!!profitCenter}>
            <select value={profitCenter} onChange={(e) => setProfitCenter(e.target.value)} className="px-select">
              <option value="">Select profit center</option>
              {profitCenterOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </PxFormField>
        </FormSection>

        <FormSection title="Settings" columns={2}>
          <PxFormField label="Default Functional Context" required filled={!!defaultFunctionalContext}>
            <select value={defaultFunctionalContext} onChange={(e) => setDefaultFunctionalContext(e.target.value)} className="px-select">
              <option value="">Select context</option>
              {functionalContextOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </PxFormField>
          <PxFormField label="Status" required filled={!!status}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </PxFormField>
          <PxFormField label="Profile Picture" filled={!!profilePic}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setProfilePic(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="px-input"
            />
            {profilePic && (
              <div className="mt-3 flex items-center gap-3">
                <img src={profilePic} alt="Profile Preview" className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid var(--color-silver)' }} />
                <button type="button" onClick={() => setProfilePic(null)} className="text-sm" style={{ color: 'var(--color-error)' }}>Remove</button>
              </div>
            )}
          </PxFormField>
        </FormSection>
      </FormShell>
    ) : (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/masters')} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-mercury-grey)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>Employee Master</h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>Manage employee details with approval workflow</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
          >
            <Plus className="w-5 h-5" />
          {isHydrating ? 'Loading...' : 'Add Employee'}
        </button>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        recordType="Employee Master"
        recordId={currentReviewRecord?.empCode || ''}
        changes={detectedChanges}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />

      {/* Table */}
      <div className="rounded-[24px] overflow-hidden bg-white" style={{ border: '1px solid var(--color-fog)', boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)' }}>
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1320px' }}>
            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.3fr 1.8fr 2fr 1.3fr 1.2fr 1fr 1.3fr 0.9fr', borderBottom: '1px solid #E8F0F4' }}>
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-mercury-grey)' }} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{ backgroundColor: '#F8FBFD', border: '1px solid var(--color-fog)', color: 'var(--color-ink)' }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setDepartmentFilter([]);
                      setStatusFilter([]);
                      setApprovalFilter([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', color: '#C53030', fontWeight: 600 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div />
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Department"
                  options={[...new Set(sortedEmployees.map((employee) => employee.department))]}
                  selected={departmentFilter}
                  onToggle={(value) => setDepartmentFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Active', 'Inactive']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Approval"
                  options={['Draft', 'Pending Approval', 'Approved', 'Rejected']}
                  selected={approvalFilter}
                  onToggle={(value) => setApprovalFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
            </div>

            <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: '1.3fr 1.8fr 2fr 1.3fr 1.2fr 1fr 1.3fr 0.9fr', background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)', borderBottom: '1px solid #E4EDF2' }}>
              {['Emp Code', 'Name', 'Email', 'Phone', 'Department', 'Status', 'Approval Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-mercury-grey)', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredEmployees.map((emp, index) => (
                <div
                  key={emp.id}
                  className="grid gap-4 px-6 py-4"
                  style={{
                    gridTemplateColumns: '1.3fr 1.8fr 2fr 1.3fr 1.2fr 1fr 1.3fr 0.9fr',
                    borderBottom: index === filteredEmployees.length - 1 ? 'none' : '1px solid #EDF3F7',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ color: 'var(--color-ink)', fontWeight: 700 }}>{emp.empCode}</div>
                  <div style={{ color: 'var(--color-ink)' }}>{emp.empName}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{emp.email}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{emp.phone}</div>
                  <div style={{ color: 'var(--color-mercury-grey)' }}>{emp.department}</div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: emp.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA', color: emp.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)', fontWeight: 700 }}>
                      {emp.status}
                    </span>
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-full text-xs" style={{ ...getStatusBadgeStyle(emp.approvalStatus), fontWeight: 700 }}>
                      {emp.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {emp.approvalStatus === 'Pending Approval' && (
                      <PremiumActionButton label="Review employee" icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleReview(emp)} />
                    )}
                    <PremiumActionButton label="Edit employee" icon={<Edit className="w-4 h-4" />} tone="violet" onClick={() => handleEdit(emp)} />
                    <PremiumActionButton label="Open employee" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => handleEdit(emp)} />
                    <PremiumActionButton label="Delete employee" icon={<Trash2 className="w-4 h-4" />} tone="amber" onClick={() => handleDelete(emp.id)} />
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <p className="text-base mb-1" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>No employees match the current filters</p>
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Clear one or more filters to bring the full register back.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  );
}
