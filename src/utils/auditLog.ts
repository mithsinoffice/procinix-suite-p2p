export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'APPROVE'
    | 'REJECT'
    | 'SUBMIT'
    | 'REQUEST_INFO'
    | 'VIEW'
    | 'EXPORT'
    | 'LOGIN'
    | 'LOGOUT';
  module: string; // e.g., "Contract Master", "Purchase Order", "GRN", "User Management"
  recordType: string; // e.g., "Contract", "PO", "GRN Part A", "Vendor"
  recordId: string;
  description: string;
  changes?: AuditChange[];
  ipAddress?: string;
  deviceInfo?: string;
  location?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditChange {
  field: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

class AuditLogService {
  private logs: AuditLog[] = [];
  private readonly STORAGE_KEY = 'procinix_audit_logs';

  constructor() {
    this.loadLogs();
    this.initializeDemoData();
  }

  /**
   * Load audit logs from localStorage
   */
  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      this.logs = [];
    }
  }

  /**
   * Initialize demo data if no logs exist
   */
  private initializeDemoData() {
    if (this.logs.length === 0) {
      const demoLogs: AuditLog[] = [
        {
          id: 'AUDIT-1',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          userId: 'admin',
          userName: 'Admin User',
          userEmail: 'admin@procinix.ai',
          userRole: 'Admin',
          action: 'CREATE',
          module: 'Masters',
          recordType: 'Contract Master',
          recordId: 'CON-2024-001',
          description: 'Created new Contract Master record: CON-2024-001',
          ipAddress: '192.168.1.100',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'SUCCESS',
          changes: [
            {
              field: 'vendor',
              fieldLabel: 'Vendor',
              oldValue: null,
              newValue: 'Tata Steel Ltd.',
              changeType: 'ADDED',
            },
            {
              field: 'contractStartDate',
              fieldLabel: 'Contract Start Date',
              oldValue: null,
              newValue: '2024-01-01',
              changeType: 'ADDED',
            },
            {
              field: 'ratePerUnit',
              fieldLabel: 'Rate Per Unit',
              oldValue: null,
              newValue: '65.50',
              changeType: 'ADDED',
            },
          ],
        },
        {
          id: 'AUDIT-2',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          userId: 'user1',
          userName: 'Karthik Menon',
          userEmail: 'karthik.menon@procinix.ai',
          userRole: 'PO Creator, PO Approver, GRN Manager',
          action: 'UPDATE',
          module: 'Masters',
          recordType: 'Contract Master',
          recordId: 'CON-2024-002',
          description: 'Updated Contract Master record: CON-2024-002 (2 field(s) changed)',
          ipAddress: '192.168.1.105',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'SUCCESS',
          changes: [
            {
              field: 'ratePerUnit',
              fieldLabel: 'Rate Per Unit',
              oldValue: '420.00',
              newValue: '435.00',
              changeType: 'MODIFIED',
            },
            {
              field: 'leadTime',
              fieldLabel: 'Lead Time',
              oldValue: '10',
              newValue: '12',
              changeType: 'MODIFIED',
            },
          ],
        },
        {
          id: 'AUDIT-3',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          userId: 'approver1',
          userName: 'Approver User',
          userEmail: 'approver@procinix.ai',
          userRole: 'PO Approver',
          action: 'APPROVE',
          module: 'Masters',
          recordType: 'Contract Master',
          recordId: 'CON-2024-001',
          description: 'Approved Contract Master record: CON-2024-001',
          ipAddress: '192.168.1.110',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'SUCCESS',
        },
        {
          id: 'AUDIT-4',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          userId: 'admin',
          userName: 'Admin User',
          userEmail: 'admin@procinix.ai',
          userRole: 'Admin',
          action: 'LOGIN',
          module: 'Authentication',
          recordType: 'User Session',
          recordId: 'admin@procinix.ai',
          description: 'User logged in successfully: admin@procinix.ai',
          ipAddress: '192.168.1.100',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'SUCCESS',
        },
        {
          id: 'AUDIT-5',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          userId: 'user1',
          userName: 'Karthik Menon',
          userEmail: 'karthik.menon@procinix.ai',
          userRole: 'PO Creator',
          action: 'SUBMIT',
          module: 'Purchase Orders',
          recordType: 'Purchase Order',
          recordId: 'PO-2024-0123',
          description: 'Submitted Purchase Order record for approval: PO-2024-0123',
          ipAddress: '192.168.1.105',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'SUCCESS',
        },
        {
          id: 'AUDIT-6',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          userId: 'user2',
          userName: 'Test User',
          userEmail: 'test@procinix.ai',
          userRole: 'User',
          action: 'LOGIN',
          module: 'Authentication',
          recordType: 'User Session',
          recordId: 'test@procinix.ai',
          description: 'Failed login attempt: test@procinix.ai',
          ipAddress: '192.168.1.120',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'FAILED',
          errorMessage: 'Invalid credentials',
        },
        {
          id: 'AUDIT-7',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          userId: 'admin',
          userName: 'Admin User',
          userEmail: 'admin@procinix.ai',
          userRole: 'Admin',
          action: 'EXPORT',
          module: 'Reports',
          recordType: 'Vendor Spend Report',
          recordId: 'EXPORT-1234',
          description: 'Exported Vendor Spend Report data as CSV',
          ipAddress: '192.168.1.100',
          deviceInfo: navigator.userAgent,
          location: 'Mumbai, India',
          status: 'SUCCESS',
          metadata: { format: 'CSV', recordCount: 48 },
        },
      ];

      this.logs = demoLogs;
      this.saveLogs();
    }
  }

  /**
   * Save audit logs to localStorage
   */
  private saveLogs() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save audit logs:', error);
    }
  }

  /**
   * Get current user information from session
   */
  private getCurrentUser(): {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
  } {
    try {
      const userSession = localStorage.getItem('userSession');
      if (userSession) {
        const session = JSON.parse(userSession);
        return {
          userId: session.userId || 'SYSTEM',
          userName: session.name || 'System User',
          userEmail: session.email || 'system@procinix.ai',
          userRole: Array.isArray(session.role)
            ? session.role.join(', ')
            : session.role || 'Unknown',
        };
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }

    return {
      userId: 'SYSTEM',
      userName: 'System User',
      userEmail: 'system@procinix.ai',
      userRole: 'System',
    };
  }

  /**
   * Log an audit event
   */
  log(params: {
    action: AuditLog['action'];
    module: string;
    recordType: string;
    recordId: string;
    description: string;
    changes?: AuditChange[];
    status?: 'SUCCESS' | 'FAILED';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    const user = this.getCurrentUser();

    const auditLog: AuditLog = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      userRole: user.userRole,
      action: params.action,
      module: params.module,
      recordType: params.recordType,
      recordId: params.recordId,
      description: params.description,
      changes: params.changes,
      ipAddress: this.getIPAddress(),
      deviceInfo: this.getDeviceInfo(),
      location: this.getLocation(),
      status: params.status || 'SUCCESS',
      errorMessage: params.errorMessage,
      metadata: params.metadata,
    };

    this.logs.unshift(auditLog); // Add to beginning for recent-first ordering
    this.saveLogs();

    // In production, this would also send to backend API
    console.log('Audit Log Created:', auditLog);

    return auditLog;
  }

  /**
   * Log a create action
   */
  logCreate(module: string, recordType: string, recordId: string, data: Record<string, any>) {
    const changes: AuditChange[] = Object.entries(data).map(([key, value]) => ({
      field: key,
      fieldLabel: this.formatFieldLabel(key),
      oldValue: null,
      newValue: this.formatValue(value),
      changeType: 'ADDED' as const,
    }));

    return this.log({
      action: 'CREATE',
      module,
      recordType,
      recordId,
      description: `Created new ${recordType} record: ${recordId}`,
      changes,
    });
  }

  /**
   * Log an update action
   */
  logUpdate(
    module: string,
    recordType: string,
    recordId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>
  ) {
    const changes: AuditChange[] = [];

    // Find all changed fields
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (oldValue !== newValue) {
        changes.push({
          field: key,
          fieldLabel: this.formatFieldLabel(key),
          oldValue: this.formatValue(oldValue),
          newValue: this.formatValue(newValue),
          changeType: 'MODIFIED',
        });
      }
    });

    if (changes.length === 0) {
      return null; // No changes detected
    }

    return this.log({
      action: 'UPDATE',
      module,
      recordType,
      recordId,
      description: `Updated ${recordType} record: ${recordId} (${changes.length} field(s) changed)`,
      changes,
    });
  }

  /**
   * Log a delete action
   */
  logDelete(module: string, recordType: string, recordId: string, data: Record<string, any>) {
    const changes: AuditChange[] = Object.entries(data).map(([key, value]) => ({
      field: key,
      fieldLabel: this.formatFieldLabel(key),
      oldValue: this.formatValue(value),
      newValue: null,
      changeType: 'REMOVED' as const,
    }));

    return this.log({
      action: 'DELETE',
      module,
      recordType,
      recordId,
      description: `Deleted ${recordType} record: ${recordId}`,
      changes,
    });
  }

  /**
   * Log an approval action
   */
  logApproval(
    module: string,
    recordType: string,
    recordId: string,
    approved: boolean,
    comments?: string
  ) {
    return this.log({
      action: approved ? 'APPROVE' : 'REJECT',
      module,
      recordType,
      recordId,
      description: approved
        ? `Approved ${recordType} record: ${recordId}${comments ? ` - ${comments}` : ''}`
        : `Rejected ${recordType} record: ${recordId}${comments ? ` - ${comments}` : ''}`,
      metadata: { comments },
    });
  }

  /**
   * Log a submission action
   */
  logSubmit(module: string, recordType: string, recordId: string) {
    return this.log({
      action: 'SUBMIT',
      module,
      recordType,
      recordId,
      description: `Submitted ${recordType} record for approval: ${recordId}`,
    });
  }

  /**
   * Log a request for more information
   */
  logRequestInfo(module: string, recordType: string, recordId: string, comments: string) {
    return this.log({
      action: 'REQUEST_INFO',
      module,
      recordType,
      recordId,
      description: `Requested more information for ${recordType} record: ${recordId} - ${comments}`,
      metadata: { comments },
    });
  }

  /**
   * Log a view action (for sensitive data)
   */
  logView(module: string, recordType: string, recordId: string) {
    return this.log({
      action: 'VIEW',
      module,
      recordType,
      recordId,
      description: `Viewed ${recordType} record: ${recordId}`,
    });
  }

  /**
   * Log an export action
   */
  logExport(module: string, recordType: string, format: string, filters?: any) {
    return this.log({
      action: 'EXPORT',
      module,
      recordType,
      recordId: `EXPORT-${Date.now()}`,
      description: `Exported ${recordType} data as ${format}`,
      metadata: { format, filters },
    });
  }

  /**
   * Log a login action
   */
  logLogin(email: string, status: 'SUCCESS' | 'FAILED', errorMessage?: string) {
    return this.log({
      action: 'LOGIN',
      module: 'Authentication',
      recordType: 'User Session',
      recordId: email,
      description:
        status === 'SUCCESS'
          ? `User logged in successfully: ${email}`
          : `Failed login attempt: ${email}`,
      status,
      errorMessage,
    });
  }

  /**
   * Log a logout action
   */
  logLogout(email: string) {
    return this.log({
      action: 'LOGOUT',
      module: 'Authentication',
      recordType: 'User Session',
      recordId: email,
      description: `User logged out: ${email}`,
    });
  }

  /**
   * Get all audit logs
   */
  getAllLogs(): AuditLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by user
   */
  getLogsByUser(userId: string): AuditLog[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  /**
   * Get logs by module
   */
  getLogsByModule(module: string): AuditLog[] {
    return this.logs.filter((log) => log.module === module);
  }

  /**
   * Get logs by record
   */
  getLogsByRecord(recordId: string): AuditLog[] {
    return this.logs.filter((log) => log.recordId === recordId);
  }

  /**
   * Get logs by date range
   */
  getLogsByDateRange(startDate: string, endDate: string): AuditLog[] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
  }

  /**
   * Clear all logs (admin only - use with caution)
   */
  clearAllLogs() {
    this.logs = [];
    this.saveLogs();
  }

  /**
   * Export logs as JSON
   */
  exportLogsAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsAsCSV(): string {
    if (this.logs.length === 0) {
      return '';
    }

    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'User Role',
      'Action',
      'Module',
      'Record Type',
      'Record ID',
      'Description',
      'Status',
      'IP Address',
      'Changes',
    ];

    const rows = this.logs.map((log) => [
      log.timestamp,
      log.userName,
      log.userEmail,
      log.userRole,
      log.action,
      log.module,
      log.recordType,
      log.recordId,
      log.description,
      log.status,
      log.ipAddress || 'N/A',
      log.changes ? log.changes.length.toString() : '0',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Format field label for display
   */
  private formatFieldLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Get IP address (mock - in production, get from backend)
   */
  private getIPAddress(): string {
    return '192.168.1.100'; // Mock IP - In production, get from backend
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): string {
    return navigator.userAgent;
  }

  /**
   * Get location (mock - in production, use geolocation API or backend)
   */
  private getLocation(): string {
    return 'Mumbai, India'; // Mock location
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();

// Convenience functions
export const logAudit = auditLogService.log.bind(auditLogService);
export const logCreate = auditLogService.logCreate.bind(auditLogService);
export const logUpdate = auditLogService.logUpdate.bind(auditLogService);
export const logDelete = auditLogService.logDelete.bind(auditLogService);
export const logApproval = auditLogService.logApproval.bind(auditLogService);
export const logSubmit = auditLogService.logSubmit.bind(auditLogService);
export const logRequestInfo = auditLogService.logRequestInfo.bind(auditLogService);
export const logView = auditLogService.logView.bind(auditLogService);
export const logExport = auditLogService.logExport.bind(auditLogService);
export const logLogin = auditLogService.logLogin.bind(auditLogService);
export const logLogout = auditLogService.logLogout.bind(auditLogService);
