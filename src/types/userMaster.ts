/**
 * User Master domain types.
 * Each assigned-entity row carries role + validity (UI); persist splits to `user_entity_access` + `user_roles`.
 */

export interface UserEntityAccessRow {
  id: string;
  entityId: string;
  roleId: string;
  validFrom: string;
  validTo: string;
  isDefault: boolean;
  status: 'Active' | 'Inactive';
  roleName?: string;
  roleCode?: string;
}

export interface UserRoleAssignmentRow {
  id: string;
  roleId: string;
  entityId: string;
  status: 'Active' | 'Inactive';
  validFrom: string;
  validTo: string;
  roleName?: string;
  roleCode?: string;
}

export interface UserMasterRecord {
  id: string;
  userCode: string;
  employeeId: string;
  name: string;
  email: string;
  username: string;
  userType: string;
  loginMethod: string;
  locked: boolean;
  passwordResetRequired: boolean;
  accessExpiryDate: string;
  defaultEntityId: string;
  remarks: string;
  password?: string;
  status: 'Active' | 'Inactive' | 'Pending Approval';
  createdDate: string;
  approvalStatus?: 'Approved' | 'Pending' | 'Rejected';
  userEntityAccess: UserEntityAccessRow[];
  userRoles: UserRoleAssignmentRow[];
}

export function newRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createUserEntityAccessRow(partial?: Partial<UserEntityAccessRow>): UserEntityAccessRow {
  return {
    id: partial?.id ?? newRowId(),
    entityId: partial?.entityId ?? '',
    roleId: partial?.roleId ?? '',
    validFrom: partial?.validFrom ?? '',
    validTo: partial?.validTo ?? '',
    isDefault: partial?.isDefault ?? false,
    status: partial?.status ?? 'Active',
    roleName: partial?.roleName,
    roleCode: partial?.roleCode,
  };
}

export function createUserRoleAssignmentRow(partial?: Partial<UserRoleAssignmentRow>): UserRoleAssignmentRow {
  return {
    id: partial?.id ?? newRowId(),
    roleId: partial?.roleId ?? '',
    entityId: partial?.entityId ?? '',
    status: partial?.status ?? 'Active',
    validFrom: partial?.validFrom ?? '',
    validTo: partial?.validTo ?? '',
    roleName: partial?.roleName,
    roleCode: partial?.roleCode,
  };
}

export function deriveUserRolesFromEntityRows(rows: UserEntityAccessRow[]): UserRoleAssignmentRow[] {
  return rows
    .filter((r) => r.entityId.trim() && r.roleId.trim())
    .map((r) => ({
      id: r.id,
      roleId: r.roleId.trim(),
      entityId: r.entityId.trim(),
      status: r.status,
      validFrom: (r.validFrom ?? '').trim(),
      validTo: (r.validTo ?? '').trim(),
      roleName: r.roleName,
      roleCode: r.roleCode,
    }));
}

function mergeAccessRowsWithLegacyRoles(
  accessInput: UserEntityAccessRow[],
  rolesInput: UserRoleAssignmentRow[],
): UserEntityAccessRow[] {
  const usedRoleRowIds = new Set<string>();

  const normalizeAccess = (rows: UserEntityAccessRow[]): UserEntityAccessRow[] =>
    rows.map((a) =>
      createUserEntityAccessRow({
        id: a.id,
        entityId: a.entityId ?? '',
        roleId: a.roleId ?? '',
        validFrom: a.validFrom ?? '',
        validTo: a.validTo ?? '',
        isDefault: a.isDefault ?? false,
        status: a.status === 'Inactive' ? 'Inactive' : 'Active',
        roleName: a.roleName,
        roleCode: a.roleCode,
      }),
    );

  let access = normalizeAccess(accessInput.length ? accessInput : []);

  if (access.length === 0 && rolesInput.some((r) => r.entityId.trim())) {
    return rolesInput
      .filter((r) => r.entityId.trim())
      .map((r, i) =>
        createUserEntityAccessRow({
          entityId: r.entityId,
          roleId: r.roleId,
          validFrom: r.validFrom,
          validTo: r.validTo,
          status: r.status,
          roleName: r.roleName,
          roleCode: r.roleCode,
          isDefault: i === 0,
        }),
      );
  }

  access = access.map((a) => {
    const row = createUserEntityAccessRow({ ...a });
    const eid = row.entityId.trim();
    if (!eid || row.roleId.trim()) {
      return row;
    }
    const match = rolesInput.find(
      (r) => r.entityId.trim() === eid && !usedRoleRowIds.has(r.id),
    );
    if (match) {
      usedRoleRowIds.add(match.id);
      return createUserEntityAccessRow({
        ...row,
        roleId: match.roleId,
        validFrom: match.validFrom || row.validFrom,
        validTo: match.validTo || row.validTo,
        roleName: match.roleName ?? row.roleName,
        roleCode: match.roleCode ?? row.roleCode,
        status: match.status ?? row.status,
      });
    }
    return row;
  });

  for (const r of rolesInput) {
    if (!r.entityId.trim() || usedRoleRowIds.has(r.id)) continue;
    const hasLine = access.some((x) => x.entityId.trim() === r.entityId.trim());
    if (!hasLine) {
      usedRoleRowIds.add(r.id);
      access.push(
        createUserEntityAccessRow({
          entityId: r.entityId,
          roleId: r.roleId,
          validFrom: r.validFrom,
          validTo: r.validTo,
          status: r.status,
          roleName: r.roleName,
          roleCode: r.roleCode,
          isDefault: false,
        }),
      );
    }
  }

  if (access.length === 0) {
    access = [createUserEntityAccessRow({ isDefault: true })];
  }

  return access;
}

function ensureSingleDefault(rows: UserEntityAccessRow[]): UserEntityAccessRow[] {
  const withEntity = rows.filter((row) => row.entityId.trim());
  const defaults = rows.filter((row) => row.isDefault);
  if (defaults.length === 0 && withEntity.length === 1) {
    return rows.map((row) =>
      row.id === withEntity[0].id ? { ...row, isDefault: true } : { ...row, isDefault: false },
    );
  }
  if (defaults.length === 0) {
    return rows;
  }
  const first = defaults[0];
  return rows.map((row) => ({ ...row, isDefault: row.id === first.id }));
}

export function normalizeUserMasterRecord(raw: unknown): UserMasterRecord {
  const r = raw as Record<string, unknown> & Partial<UserMasterRecord>;

  const fromSnakeAccess = r.user_entity_access;
  const fromSnakeRoles = r.user_roles;

  let userEntityAccess: UserEntityAccessRow[] = Array.isArray(r.userEntityAccess)
    ? (r.userEntityAccess as UserEntityAccessRow[])
    : Array.isArray(fromSnakeAccess)
      ? (fromSnakeAccess as UserEntityAccessRow[])
      : [];

  let userRoles: UserRoleAssignmentRow[] = Array.isArray(r.userRoles)
    ? (r.userRoles as UserRoleAssignmentRow[])
    : Array.isArray(fromSnakeRoles)
      ? (fromSnakeRoles as UserRoleAssignmentRow[])
      : [];

  const legacyRole = typeof r.role === 'string' && r.role.trim() ? r.role.trim() : '';

  if (userRoles.length === 0 && legacyRole) {
    userRoles = [
      createUserRoleAssignmentRow({
        roleId: '',
        entityId: '',
        roleName: legacyRole,
        roleCode: legacyRole,
      }),
    ];
  }

  userEntityAccess = mergeAccessRowsWithLegacyRoles(userEntityAccess, userRoles);
  userEntityAccess = ensureSingleDefault(userEntityAccess);
  userRoles = deriveUserRolesFromEntityRows(userEntityAccess);

  const legacyStatus = r.status as UserMasterRecord['status'] | undefined;
  const status: UserMasterRecord['status'] =
    legacyStatus === 'Active' || legacyStatus === 'Inactive' || legacyStatus === 'Pending Approval'
      ? legacyStatus
      : 'Pending Approval';

  const legacyCode = typeof r.code === 'string' ? r.code.trim() : '';
  const userCode = String(r.userCode ?? '').trim();
  let employeeId = String(r.employeeId ?? '').trim();
  if (!employeeId && legacyCode) {
    employeeId = legacyCode;
  }

  return {
    id: String(r.id ?? ''),
    userCode,
    employeeId,
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    username: String(r.username ?? ''),
    userType: String(r.userType ?? r.user_type ?? ''),
    loginMethod: String(r.loginMethod ?? r.login_method ?? 'Password'),
    locked: Boolean(r.locked),
    passwordResetRequired: Boolean(r.passwordResetRequired ?? r.password_reset_required),
    accessExpiryDate: String(r.accessExpiryDate ?? r.access_expiry_date ?? ''),
    defaultEntityId: String(r.defaultEntityId ?? r.default_entity_id ?? ''),
    remarks: String(r.remarks ?? ''),
    password: typeof r.password === 'string' ? r.password : undefined,
    status,
    createdDate: String(r.createdDate ?? r.created_date ?? new Date().toISOString().split('T')[0]),
    approvalStatus: (r.approvalStatus ?? r.approval_status) as UserMasterRecord['approvalStatus'],
    userEntityAccess,
    userRoles,
  };
}
