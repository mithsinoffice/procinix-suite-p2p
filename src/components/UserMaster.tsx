import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Mail, Shield, Check, AlertCircle, Clock, Building2, Lock } from 'lucide-react';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import { useAuth } from '../contexts/AuthContext';
import type { UserMasterRecord, UserEntityAccessRow } from '../types/userMaster';
import {
  normalizeUserMasterRecord,
  createUserEntityAccessRow,
  deriveUserRolesFromEntityRows,
} from '../types/userMaster';
import { FormShell, FormSection, PxFormField, CheckCard, type SaveStatus } from './ui/form-primitives';
import { useFormKeyboardSave } from '../hooks/useFormKeyboardSave';
import {
  formColors,
  formSectionBlockStyle,
  gridFormTwoColGap4,
  inputStyle,
  inputStyleCompact,
  labelStyle,
  readOnlyDisplayRowStyle,
  readOnlyInputStyle,
  sectionTitleStyle,
  selectStyle,
  selectStyleCompact,
  tableEntityLockedCellStyle,
} from './ui/formTokens';

interface EmployeeOption {
  id: string;
  empCode: string;
  empName: string;
  email: string;
  official_email?: string;
  phone: string;
  department: string;
  /** Primary / base entity label from Employee Master (matched to Entity Master) */
  baseEntity?: string;
  status?: string;
  approvalStatus?: string;
}

interface RoleOption {
  id: string;
  roleCode: string;
  roleName: string;
  status?: string;
  approvalStatus?: string;
  /** If set and non-empty, role is only offered for these entity ids; omitted = all entities. */
  allowedEntityIds?: string[];
}

interface EntityOption {
  id: string;
  code: string;
  name: string;
  legalName: string;
  isActive?: boolean;
  status?: string;
  approvalStatus?: string;
}

const USER_TYPE_BASE: { value: string; label: string }[] = [{ value: 'Employee', label: 'Employee' }];

const USER_TYPE_OPTIONS: { value: string; label: string }[] = [];

const LOGIN_METHOD_OPTIONS = ['Password', 'SSO', 'OIDC'];

function officialEmailFromEmployee(emp: EmployeeOption): string {
  const o = emp.official_email?.trim();
  if (o) return o;
  return emp.email?.trim() ?? '';
}

function deriveUsernameFromEmployee(emp: EmployeeOption): string {
  const official = officialEmailFromEmployee(emp);
  if (official.includes('@')) {
    const local = official.split('@')[0]?.trim();
    if (local) return local;
  }
  return emp.empCode?.trim() ?? '';
}

/** Map Employee Master `baseEntity` text to Entity Master id (legal name / name / code). */
function resolvePrimaryEntityId(baseEntityRaw: string | undefined, entities: EntityOption[]): string {
  const t = (baseEntityRaw ?? '').trim().toLowerCase();
  if (!t) return '';
  for (const e of entities) {
    const candidates = [
      (e.legalName ?? '').trim().toLowerCase(),
      (e.name ?? '').trim().toLowerCase(),
      (e.code ?? '').trim().toLowerCase(),
    ].filter(Boolean);
    for (const c of candidates) {
      if (!c) continue;
      if (c === t || c.includes(t) || t.includes(c)) {
        return e.id;
      }
    }
  }
  return '';
}

type UserFormState = Omit<UserMasterRecord, 'id' | 'createdDate' | 'approvalStatus' | 'userRoles'> & {
  password: string;
  employeeMasterRecordId: string;
};

function emptyFormState(): UserFormState {
  return {
    userCode: '',
    employeeId: '',
    employeeMasterRecordId: '',
    name: '',
    email: '',
    username: '',
    userType: '',
    loginMethod: 'Password',
    locked: false,
    passwordResetRequired: false,
    accessExpiryDate: '',
    defaultEntityId: '',
    remarks: '',
    password: '',
    status: 'Pending Approval',
    userEntityAccess: [createUserEntityAccessRow({ isDefault: true })],
  };
}

function recordToFormState(
  record: UserMasterRecord,
  includePassword: boolean,
  employees: EmployeeOption[],
): UserFormState {
  const match = employees.find(
    (e) => e.empCode.trim().toLowerCase() === record.employeeId.trim().toLowerCase(),
  );
  return {
    userCode: record.userCode,
    employeeId: record.employeeId,
    employeeMasterRecordId: match?.id ?? '',
    name: record.name,
    email: record.email,
    username: record.username,
    userType: record.userType,
    loginMethod: record.loginMethod || 'Password',
    locked: record.locked,
    passwordResetRequired: record.passwordResetRequired,
    accessExpiryDate: record.accessExpiryDate,
    defaultEntityId: record.defaultEntityId,
    remarks: record.remarks,
    password: includePassword ? (record.password ?? '') : '',
    status: record.status,
    userEntityAccess: normalizeFormAccessForEdit(record.defaultEntityId, record.userEntityAccess),
  };
}

function includesSafe(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function readRoleAllowedEntityIds(r: RoleOption & Record<string, unknown>): string[] | undefined {
  const a = r.allowedEntityIds;
  if (Array.isArray(a) && a.length) return a.map((x) => String(x));
  const b = r.entityIds;
  if (Array.isArray(b) && b.length) return b.map((x) => String(x));
  const c = r.entity_ids;
  if (Array.isArray(c) && c.length) return c.map((x) => String(x));
  return undefined;
}

function roleAppliesToEntity(role: RoleOption, entityId: string): boolean {
  const eid = entityId.trim();
  if (!eid) return false;
  const ext = role as RoleOption & Record<string, unknown>;
  const allowed = readRoleAllowedEntityIds(ext);
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(eid);
}

function rolesForEntitySelect(roles: RoleOption[], entityId: string): RoleOption[] {
  return roles.filter((role) => roleAppliesToEntity(role, entityId));
}

/** Row 0 = default context; remaining rows are user-added. */
function normalizeFormAccessForEdit(defaultEntityId: string, rows: UserEntityAccessRow[]): UserEntityAccessRow[] {
  const d = defaultEntityId.trim();
  const list = rows.length ? rows.map((r) => ({ ...r })) : [createUserEntityAccessRow({ isDefault: true })];
  if (!d) {
    const withEntity = list.filter((r) => r.entityId.trim());
    const row0 = createUserEntityAccessRow({ isDefault: true });
    return [row0, ...withEntity.map((r) => ({ ...r, isDefault: false }))];
  }
  const matchPreferDefault = list.find((r) => r.entityId.trim() === d && r.isDefault);
  const matchAny = matchPreferDefault ?? list.find((r) => r.entityId.trim() === d);
  let row0: UserEntityAccessRow;
  let rest: UserEntityAccessRow[];
  if (matchAny) {
    row0 = { ...matchAny, entityId: d, isDefault: true };
    rest = list.filter((r) => r.id !== matchAny.id);
  } else {
    row0 = createUserEntityAccessRow({ entityId: d, isDefault: true });
    rest = [...list];
  }
  return [row0, ...rest.map((r) => ({ ...r, isDefault: false }))];
}

export function UserMaster() {
  const { refreshSession } = useAuth();
  const userMasterInitial = useMemo<UserMasterRecord[]>(() => [], []);
  const entityMasterInitial = useMemo<EntityOption[]>(() => [], []);
  const employeeMasterInitial = useMemo<EmployeeOption[]>(() => [], []);
  const rolesMasterInitial = useMemo<RoleOption[]>(() => [], []);

  const [users, setUsers] = useIncrementalMasterRecords<UserMasterRecord>('user_master', userMasterInitial);
  const [employees] = useIncrementalMasterRecords<EmployeeOption>('employee_master', employeeMasterInitial);
  const [roles] = useIncrementalMasterRecords<RoleOption>('roles_master', rolesMasterInitial);
  const [entities] = useIncrementalMasterRecords<EntityOption>('entity_master', entityMasterInitial);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [selectedUser, setSelectedUser] = useState<UserMasterRecord | null>(null);
  const [formData, setFormData] = useState<UserFormState>(() => emptyFormState());
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeComboOpen, setEmployeeComboOpen] = useState(false);
  const employeeComboRef = useRef<HTMLDivElement>(null);

  const normalizedUsers = useMemo(() => users.map((u) => normalizeUserMasterRecord(u)), [users]);

  const approvedEmployees = useMemo(
    () =>
      employees.filter(
        (employee) => employee.status !== 'Inactive' && employee.approvalStatus === 'Approved',
      ),
    [employees],
  );
  const approvedRoles = useMemo(
    () =>
      roles
        .filter((role) => role.status !== 'Inactive' && role.approvalStatus === 'Approved')
        .map((role) => {
          const ext = role as RoleOption & Record<string, unknown>;
          const allowed = readRoleAllowedEntityIds(ext);
          return allowed ? { ...role, allowedEntityIds: allowed } : role;
        }),
    [roles],
  );
  const approvedEntities = useMemo(
    () =>
      entities.filter((entity) => {
        if (entity.isActive === false) return false;
        if (entity.status === 'Inactive') return false;
        if (entity.approvalStatus === 'Pending Approval' || entity.approvalStatus === 'Rejected') return false;
        return true;
      }),
    [entities],
  );

  const entityOptionsForSelect = useMemo(() => {
    return approvedEntities.map((e) => ({
      id: e.id,
      label: `${e.code ? `${e.code} — ` : ''}${e.name || e.legalName}`,
    }));
  }, [approvedEntities]);

  const employeeComboMatches = useMemo(() => {
    const q = employeeQuery.trim();
    if (!q) return approvedEmployees;
    return approvedEmployees.filter(
      (e) =>
        includesSafe(e.empName, q) ||
        includesSafe(e.empCode, q) ||
        includesSafe(officialEmailFromEmployee(e), q) ||
        includesSafe(e.baseEntity ?? '', q) ||
        includesSafe(e.department ?? '', q),
    );
  }, [approvedEmployees, employeeQuery]);

  const userTypeOptions = useMemo(() => [...USER_TYPE_BASE, ...USER_TYPE_OPTIONS], []);

  useEffect(() => {
    const onDocMouseDown = (ev: MouseEvent) => {
      if (employeeComboRef.current && !employeeComboRef.current.contains(ev.target as Node)) {
        setEmployeeComboOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  /** Row 0 entity mirrors `defaultEntityId` (e.g. from employee base-entity match); changing it clears row 0 role when the id changes. */
  useEffect(() => {
    const d = formData.defaultEntityId.trim();
    setFormData((prev) => {
      let rows =
        prev.userEntityAccess.length > 0 ? [...prev.userEntityAccess] : [createUserEntityAccessRow({ isDefault: true })];
      const row0 = rows[0];
      const entityMatches = row0.entityId.trim() === d;
      if (entityMatches && row0.isDefault && rows.slice(1).every((r) => !r.isDefault)) {
        return prev;
      }
      const entityChanged = row0.entityId.trim() !== d;
      let next0: UserEntityAccessRow = { ...row0, entityId: d, isDefault: true };
      if (entityChanged) {
        next0 = { ...next0, roleId: '', roleName: undefined, roleCode: undefined };
      }
      const nextRows = [next0, ...rows.slice(1).map((r) => ({ ...r, isDefault: false }))];
      return { ...prev, userEntityAccess: nextRows };
    });
  }, [formData.defaultEntityId]);

  const pickEmployee = (emp: EmployeeOption) => {
    const primaryEntityId = resolvePrimaryEntityId(emp.baseEntity, approvedEntities);
    setFormData((current) => {
      const nextDefault = current.defaultEntityId.trim() || primaryEntityId;
      return {
        ...current,
        employeeMasterRecordId: emp.id,
        employeeId: emp.empCode,
        name: emp.empName,
        email: officialEmailFromEmployee(emp),
        username: deriveUsernameFromEmployee(emp),
        userType: 'Employee',
        defaultEntityId: nextDefault,
      };
    });
    setEmployeeQuery(`${emp.empName} (${emp.empCode})`);
    setEmployeeComboOpen(false);
  };

  const clearEmployeeSelection = () => {
    setFormData((current) => ({
      ...current,
      employeeMasterRecordId: '',
      employeeId: '',
    }));
    setEmployeeQuery('');
    setEmployeeComboOpen(false);
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return normalizedUsers;
    return normalizedUsers.filter((user) => {
      const fields = [
        user.name,
        user.email,
        user.userCode,
        user.employeeId,
        user.username,
        user.userType,
      ].map((s) => (s ?? '').toLowerCase());
      return fields.some((f) => f.includes(q));
    });
  }, [normalizedUsers, searchTerm]);

  const openFormCreate = () => {
    setSelectedUser(null);
    setFormData(emptyFormState());
    setEmployeeQuery('');
    setEmployeeComboOpen(false);
    setViewMode('form');
  };

  const openFormEdit = (user: UserMasterRecord) => {
    const n = normalizeUserMasterRecord(user);
    setSelectedUser(n);
    setFormData(recordToFormState(n, true, approvedEmployees));
    const m = approvedEmployees.find(
      (e) => e.empCode.trim().toLowerCase() === n.employeeId.trim().toLowerCase(),
    );
    setEmployeeQuery(m ? `${m.empName} (${m.empCode})` : '');
    setEmployeeComboOpen(false);
    setViewMode('form');
  };

  const leaveForm = () => {
    setViewMode('list');
    setSelectedUser(null);
    setFormData(emptyFormState());
    setEmployeeQuery('');
    setEmployeeComboOpen(false);
  };

  const setAccessRows = (rows: UserEntityAccessRow[]) => {
    setFormData((prev) => ({ ...prev, userEntityAccess: rows }));
  };

  const addEntityRow = () => {
    setAccessRows([...formData.userEntityAccess, createUserEntityAccessRow({ isDefault: false })]);
  };

  const removeEntityRow = (rowId: string) => {
    const firstId = formData.userEntityAccess[0]?.id;
    if (rowId === firstId) return;
    if (formData.userEntityAccess.length <= 1) return;
    const next = formData.userEntityAccess.filter((r) => r.id !== rowId);
    setAccessRows(next.map((r, i) => ({ ...r, isDefault: i === 0 })));
  };

  const updateAccessRow = (rowId: string, patch: Partial<UserEntityAccessRow>) => {
    const firstId = formData.userEntityAccess[0]?.id;
    const effective: Partial<UserEntityAccessRow> = { ...patch };
    if (rowId === firstId && effective.entityId !== undefined) {
      delete effective.entityId;
    }
    if (effective.isDefault === true && rowId !== firstId) {
      delete effective.isDefault;
    }
    if (Object.keys(effective).length === 0) return;
    setFormData((prev) => {
      const fid = prev.userEntityAccess[0]?.id;
      const rows = prev.userEntityAccess.map((r) => {
        if (r.id !== rowId) return r;
        let next = { ...r, ...effective };
        if (effective.entityId !== undefined && rowId !== fid) {
          const eid = effective.entityId.trim();
          if (next.roleId.trim()) {
            const ro = approvedRoles.find((x) => x.id === next.roleId);
            if (!ro || !roleAppliesToEntity(ro, eid)) {
              next.roleId = '';
              next.roleName = undefined;
              next.roleCode = undefined;
            }
          }
        }
        if (effective.roleId !== undefined) {
          const ro = approvedRoles.find((x) => x.id === effective.roleId);
          next.roleName = ro?.roleName;
          next.roleCode = ro?.roleCode;
        }
        return next;
      });
      return { ...prev, userEntityAccess: rows };
    });
  };

  const validateForm = (): string | null => {
    if (!formData.userCode.trim()) return 'User Code is required.';
    if (!formData.employeeId.trim()) return 'Employee Name is required — search and select an employee.';
    if (!formData.name.trim()) return 'Full Name is required.';
    if (!formData.email.trim()) return 'Login Email is required.';

    const row0 = formData.userEntityAccess[0];
    const defaultId = formData.defaultEntityId.trim();

    if (defaultId) {
      if (!row0?.entityId.trim() || row0.entityId.trim() !== defaultId) {
        return 'Primary entity row must match the default entity (e.g. from employee entity match).';
      }
      if (!row0.roleId.trim()) {
        return 'Select a role for the default entity (first row).';
      }
    }

    for (let i = 1; i < formData.userEntityAccess.length; i++) {
      const row = formData.userEntityAccess[i];
      const hasE = row.entityId.trim();
      const hasR = row.roleId.trim();
      if (hasE && !hasR) {
        return 'Each added entity row with an entity selected must have a role for that entity.';
      }
      if (!hasE && hasR) {
        return 'Select an entity for each added row that has a role.';
      }
      if (row.validFrom && row.validTo && row.validTo < row.validFrom) {
        return 'Valid To cannot be earlier than Valid From.';
      }
    }

    if (row0?.validFrom && row0.validTo && row0.validTo < row0.validFrom) {
      return 'Valid To cannot be earlier than Valid From.';
    }

    const activeRows = formData.userEntityAccess.filter(
      (r) => r.entityId.trim() && r.roleId.trim() && r.status !== 'Inactive',
    );
    if (activeRows.length === 0) {
      return 'At least one active entity row with entity and role is required — complete the first row if a default entity is set, or add rows below.';
    }

    if (!selectedUser && !formData.password.trim()) {
      return 'Login Password is required for new users.';
    }

    return null;
  };

  const buildPayload = (): UserMasterRecord => {
    const id = selectedUser?.id ?? Date.now().toString();
    const password =
      selectedUser && !formData.password.trim() ? selectedUser.password : formData.password;
    const userRoles = deriveUserRolesFromEntityRows(formData.userEntityAccess);

    return {
      id,
      userCode: formData.userCode.trim(),
      employeeId: formData.employeeId.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      userType: formData.userType.trim(),
      loginMethod: formData.loginMethod,
      locked: formData.locked,
      passwordResetRequired: formData.passwordResetRequired,
      accessExpiryDate: formData.accessExpiryDate.trim(),
      defaultEntityId: formData.defaultEntityId.trim(),
      remarks: formData.remarks.trim(),
      password,
      status: selectedUser ? formData.status : 'Pending Approval',
      createdDate: selectedUser?.createdDate ?? new Date().toISOString().split('T')[0],
      approvalStatus: 'Pending',
      userEntityAccess: formData.userEntityAccess.map((r) => ({
        ...r,
        entityId: r.entityId.trim(),
        roleId: r.roleId.trim(),
        validFrom: (r.validFrom ?? '').trim(),
        validTo: (r.validTo ?? '').trim(),
      })),
      userRoles,
    };
  };

  const handleSubmit = () => {
    const err = validateForm();
    if (err) {
      window.alert(err);
      return;
    }
    const payload = buildPayload();

    if (selectedUser) {
      setUsers((prev) =>
        prev.map((u) =>
          String((u as UserMasterRecord).id) === selectedUser.id
            ? ({ ...payload, approvalStatus: 'Pending' as const } as UserMasterRecord)
            : u,
        ),
      );
    } else {
      setUsers((prev) => [...prev, { ...payload, approvalStatus: 'Pending' as const } as UserMasterRecord]);
    }

    leaveForm();
    window.setTimeout(() => {
      refreshSession();
    }, 300);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: typeof Check }> = {
      Active: { bg: '#E8F7F0', text: '#0A7E4A', icon: Check },
      Inactive: { bg: '#FFE5E5', text: '#D32F2F', icon: AlertCircle },
      'Pending Approval': { bg: '#FFF9E6', text: '#D97706', icon: Clock },
    };
    const config = styles[status] || styles['Pending Approval'];
    const Icon = config.icon;
    return (
      <span
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full"
        style={{ backgroundColor: config.bg, color: config.text, fontSize: '12px', fontWeight: '500' }}
      >
        <Icon style={{ width: '14px', height: '14px' }} />
        {status}
      </span>
    );
  };

  const summarizeAccess = (user: UserMasterRecord) => {
    const n = user.userRoles.filter((r) => r.entityId.trim() && r.roleId.trim() && r.status !== 'Inactive').length;
    if (!n) return '—';
    return n === 1 ? '1 role' : `${n} roles`;
  };

  const entityLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of entityOptionsForSelect) m.set(o.id, o.label);
    return (id: string) => m.get(id.trim()) ?? '';
  }, [entityOptionsForSelect]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const completeness = useMemo(() => {
    const fields = [formData.userCode, formData.employeeId, formData.name, formData.email];
    const filled = fields.filter((v) => String(v).trim().length > 0).length;
    const hasEntityAccess = formData.userEntityAccess.some((r) => r.entityId.trim() && r.roleId.trim()) ? 1 : 0;
    return { filled: filled + hasEntityAccess, total: fields.length + 1 };
  }, [formData.userCode, formData.employeeId, formData.name, formData.email, formData.userEntityAccess]);

  const handleSaveDraftUser = useCallback(() => {
    setSaveStatus('saving');
    handleSubmit();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [handleSubmit]);

  useFormKeyboardSave(viewMode === 'form' ? handleSaveDraftUser : undefined);

  const formContent = (
    <>
      <FormSection title="User Details" columns={2}>
        <PxFormField label="User Code" required filled={!!formData.userCode.trim()} hint="Unique user identifier">
          <input
            type="text"
            value={formData.userCode}
            onChange={(e) => setFormData({ ...formData, userCode: e.target.value })}
            placeholder="Unique user code"
            className="px-input"
          />
        </PxFormField>
        <PxFormField label="Employee Name" required filled={!!formData.employeeMasterRecordId} hint="Search and select an employee">
          <div ref={employeeComboRef} className="relative">
            <input
              type="text"
              value={employeeQuery}
              onChange={(e) => {
                const v = e.target.value;
                setEmployeeQuery(v);
                setEmployeeComboOpen(true);
                if (formData.employeeMasterRecordId) {
                  setFormData((f) => ({ ...f, employeeMasterRecordId: '', employeeId: '' }));
                }
              }}
              onFocus={() => setEmployeeComboOpen(true)}
              placeholder="Type to search name, code, email, entity..."
              className="px-input"
              autoComplete="off"
              role="combobox"
              aria-expanded={employeeComboOpen}
              aria-autocomplete="list"
            />
            {employeeComboOpen && (
              <ul
                className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border bg-white shadow-lg"
                style={{ borderColor: 'var(--color-silver)', top: '100%' }}
                role="listbox"
              >
                {employeeComboMatches.length === 0 ? (
                  <li className="px-3 py-2 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    No matching employees
                  </li>
                ) : (
                  employeeComboMatches.map((emp) => (
                    <li key={emp.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--color-cloud)] border-0 bg-transparent cursor-pointer"
                        style={{ color: 'var(--color-ink)' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickEmployee(emp)}
                      >
                        <span style={{ fontWeight: 600 }}>{emp.empName}</span>
                        <span style={{ color: 'var(--color-mercury-grey)' }}> · {emp.empCode}</span>
                        {emp.baseEntity ? (
                          <span className="block text-xs mt-0.5" style={{ color: 'var(--color-mercury-grey)' }}>
                            {emp.baseEntity}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            <button
              type="button"
              className="mt-1 text-xs border-0 bg-transparent cursor-pointer"
              style={{ color: 'var(--color-teal)' }}
              onClick={clearEmployeeSelection}
            >
              Clear selection
            </button>
          </div>
        </PxFormField>
        <PxFormField label="Full Name" required filled={!!formData.name.trim()}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="From Employee Master (editable)"
            className="px-input"
          />
        </PxFormField>
        <PxFormField label="Login Email" required filled={!!formData.email.trim()}>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Official email (editable)"
            className="px-input"
          />
        </PxFormField>
        <PxFormField label="Username" filled={!!formData.username.trim()}>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="From email or employee code (editable)"
            className="px-input"
          />
        </PxFormField>
        <PxFormField label="User Type" filled={!!formData.userType}>
          <select
            value={formData.userType}
            onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
            className="px-select"
          >
            <option value="">Select user type</option>
            {userTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </PxFormField>
        <PxFormField label="Linked Employee (reference)" filled={!!formData.employeeId}>
          <input
            type="text"
            value={formData.employeeId ? formData.employeeId : '\u2014'}
            readOnly
            tabIndex={-1}
            className="px-input"
            style={{ opacity: 0.6, cursor: 'default' }}
            title="Set by Employee Name selection"
          />
        </PxFormField>
        <PxFormField label="Login Method" filled={!!formData.loginMethod}>
          <select
            value={formData.loginMethod}
            onChange={(e) => setFormData({ ...formData, loginMethod: e.target.value })}
            className="px-select"
          >
            {LOGIN_METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </PxFormField>
        <PxFormField label="Active" filled={!!formData.status}>
          {selectedUser ? (
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as UserMasterRecord['status'],
                })
              }
              className="px-select"
            >
              <option value="Pending Approval">Pending Approval</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          ) : (
            <div style={readOnlyDisplayRowStyle}>Pending Approval (after create)</div>
          )}
        </PxFormField>
        <PxFormField label="Access Expiry Date" filled={!!formData.accessExpiryDate}>
          <input
            type="date"
            value={formData.accessExpiryDate}
            onChange={(e) => setFormData({ ...formData, accessExpiryDate: e.target.value })}
            className="px-input"
          />
        </PxFormField>
        <PxFormField label={`Login Password${!selectedUser ? ' *' : ''}`} required={!selectedUser} filled={!!formData.password.trim()} hint="Used by the login screen when the user is approved and active">
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={selectedUser ? 'Leave blank to keep existing password' : 'Set login password'}
            className="px-input"
          />
        </PxFormField>
        <CheckCard
          title="Locked"
          subtitle="Prevent this user from logging in"
          checked={formData.locked}
          onChange={(v) => setFormData({ ...formData, locked: v })}
        />
        <CheckCard
          title="Password Reset Required"
          subtitle="Force password change on next login"
          checked={formData.passwordResetRequired}
          onChange={(v) => setFormData({ ...formData, passwordResetRequired: v })}
        />
      </FormSection>
      <input type="hidden" name="linked_employee_id" value={formData.employeeId} />

      <h3 style={sectionTitleStyle}>C. Assigned entities &amp; roles</h3>
      <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: '0 0 12px 0' }}>
        The first row mirrors the default entity when one is set (for example from Employee Master{' '}
        <code style={{ fontSize: '11px' }}>baseEntity</code> matching Entity Master); that entity is fixed in the grid —
        choose role and validity only. Use <strong>Add row</strong> for more entities. Roles can be limited per entity
        via <code style={{ fontSize: '11px' }}>allowedEntityIds</code> / <code style={{ fontSize: '11px' }}>entityIds</code>{' '}
        on the role; otherwise all approved roles apply. Persists to{' '}
        <code style={{ fontSize: '11px' }}>user_entity_access</code> and <code style={{ fontSize: '11px' }}>user_roles</code>.
      </p>
      <div
        style={{
          border: `1px solid ${formColors.border}`,
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '8px',
        }}
      >
        <div style={{ overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: formColors.tableHeaderBg }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
                  Entity <span style={{ color: 'var(--color-error)' }}>*</span>
                </th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
                  Role <span style={{ color: 'var(--color-error)' }}>*</span>
                </th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: 'var(--color-mercury-grey)', width: '56px' }}>
                  Def.
                </th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', color: 'var(--color-mercury-grey)', width: '100px' }}>
                  Status
                </th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', color: 'var(--color-mercury-grey)', width: '108px' }}>
                  Valid from
                </th>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', color: 'var(--color-mercury-grey)', width: '108px' }}>
                  Valid to
                </th>
                <th style={{ padding: '10px 8px', width: '40px' }} />
              </tr>
            </thead>
            <tbody>
              {formData.userEntityAccess.map((row, rowIndex) => {
                const isPrimaryRow = rowIndex === 0;
                const entityIdForRoles = row.entityId.trim();
                const roleChoices = rolesForEntitySelect(approvedRoles, entityIdForRoles);
                return (
                <tr key={row.id} style={{ borderTop: `1px solid ${formColors.border}` }}>
                  <td style={{ padding: '8px', verticalAlign: 'middle', minWidth: 0 }}>
                    {isPrimaryRow ? (
                      <div
                        style={tableEntityLockedCellStyle}
                        title="Mirrors default entity when set (e.g. from employee entity match)"
                      >
                        <Lock style={{ width: '14px', height: '14px', color: 'var(--color-mercury-grey)', flexShrink: 0 }} />
                        <span className="min-w-0 truncate">
                          {entityIdForRoles
                            ? entityLabel(row.entityId)
                            : 'No default entity — use Add row below'}
                        </span>
                      </div>
                    ) : (
                      <select
                        value={row.entityId}
                        onChange={(e) => updateAccessRow(row.id, { entityId: e.target.value })}
                        style={selectStyleCompact}
                      >
                        <option value="">Select entity</option>
                        {entityOptionsForSelect.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle', minWidth: 0 }}>
                    <select
                      value={row.roleId}
                      onChange={(e) => updateAccessRow(row.id, { roleId: e.target.value })}
                      disabled={!entityIdForRoles}
                      style={{
                        ...selectStyleCompact,
                        opacity: entityIdForRoles ? 1 : 0.6,
                      }}
                    >
                      <option value="">{entityIdForRoles ? 'Select role' : 'Select entity first'}</option>
                      {roleChoices.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.roleName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {isPrimaryRow ? (
                      formData.defaultEntityId.trim() ? (
                        <span
                          title="Default entity row (mirrors matched base entity when set)"
                          style={{ fontSize: '12px', color: '#0A7E4A', fontWeight: 600 }}
                        >
                          Default
                        </span>
                      ) : (
                        <span
                          title="No default row entity — assign access using Add row"
                          style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}
                        >
                          —
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-silver)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                    <select
                      value={row.status}
                      onChange={(e) =>
                        updateAccessRow(row.id, { status: e.target.value as UserEntityAccessRow['status'] })
                      }
                      style={selectStyleCompact}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                    <input
                      type="date"
                      value={row.validFrom}
                      onChange={(e) => updateAccessRow(row.id, { validFrom: e.target.value })}
                      style={inputStyleCompact}
                    />
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                    <input
                      type="date"
                      value={row.validTo}
                      onChange={(e) => updateAccessRow(row.id, { validTo: e.target.value })}
                      style={inputStyleCompact}
                    />
                  </td>
                  <td style={{ padding: '8px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeEntityRow(row.id)}
                      disabled={isPrimaryRow || formData.userEntityAccess.length <= 1}
                      title={isPrimaryRow ? 'Primary row cannot be removed' : 'Remove row'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: isPrimaryRow || formData.userEntityAccess.length <= 1 ? 'not-allowed' : 'pointer',
                        opacity: isPrimaryRow || formData.userEntityAccess.length <= 1 ? 0.35 : 1,
                        padding: '4px',
                      }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }} />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-silver)', background: '#FAFBFC' }}>
          <button
            type="button"
            onClick={addEntityRow}
            className="flex items-center gap-1 text-sm"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-teal)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            Add row
          </button>
        </div>
      </div>
    </>
  );

  if (viewMode === 'form') {
    return (
      <FormShell
        title="User Master"
        subtitle={
          selectedUser
            ? `Edit user ${formData.userCode || selectedUser.userCode || ''} — identity, access, and per-entity roles.`
            : 'Create a user with identity, system access, and a role on each entity row.'
        }
        modeLabel={selectedUser ? 'Edit' : 'Create'}
        draftStatus={selectedUser ? 'Draft' : 'New'}
        completeness={completeness}
        onBack={leaveForm}
        onCancel={leaveForm}
        onSaveDraft={handleSaveDraftUser}
        onSubmit={handleSubmit}
        submitLabel={selectedUser ? 'Update User' : 'Create User'}
        draftLabel="Save Draft"
        saveStatus={saveStatus}
      >
        {formContent}
      </FormShell>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>User Master</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: '4px 0 0 0' }}>
            Manage system users and their access
          </p>
        </div>
        <button
          type="button"
          onClick={openFormCreate}
          className="flex items-center gap-2 rounded-lg transition-all"
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--color-teal)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-teal)';
          }}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          Add User
        </button>
      </div>

      <div
        className="rounded-lg"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-silver)',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <div className="flex items-center gap-2" style={{ position: 'relative' }}>
          <Search
            style={{ position: 'absolute', left: '12px', width: '18px', height: '18px', color: 'var(--color-mercury-grey)' }}
          />
          <input
            type="text"
            placeholder="Search by user code, name, email, linked employee…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 10px 10px 40px',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div
        className="rounded-lg"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-silver)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-cloud)', borderBottom: '1px solid var(--color-silver)' }}>
                {['User Code', 'Name', 'Email', 'Linked Emp.', 'Access', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-silver)' }}>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.userCode || '—'}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.name}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: 'var(--color-mercury-grey)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: 'var(--color-mercury-grey)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.employeeId || '—'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-mercury-grey)' }}>
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <Building2 style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                      <span className="truncate">{summarizeEntities(user)}</span>
                      <Shield style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                      <span className="truncate">{summarizeAccess(user)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>{getStatusBadge(user.status)}</td>
                  <td style={{ padding: '16px' }}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFormEdit(user)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          border: '1px solid var(--color-silver)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-silver)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-cloud)';
                        }}
                        title="Edit User"
                      >
                        <Edit style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
                      </button>
                      {user.approvalStatus === 'Approved' && (
                        <button
                          type="button"
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--color-cloud)',
                            border: '1px solid var(--color-silver)',
                            cursor: 'not-allowed',
                            opacity: 0.5,
                          }}
                          title="Cannot delete approved user"
                          disabled
                        >
                          <Trash2 style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function summarizeEntities(user: UserMasterRecord) {
  const n = user.userEntityAccess.filter((r) => r.entityId.trim() && r.status !== 'Inactive').length;
  if (!n) return '—';
  return n === 1 ? '1 ent.' : `${n} ent.`;
}
