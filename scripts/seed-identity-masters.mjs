const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:8787/api/masters';

const identitySeedData = {
  employee_master: [
    { id: '1', empCode: 'EMP001', empName: 'Rajesh Kumar', email: 'rajesh.kumar@procinix.ai', phone: '+91 98765 43210', department: 'Procurement', status: 'Active', approvalStatus: 'Approved' },
    { id: '2', empCode: 'EMP002', empName: 'Priya Sharma', email: 'priya.sharma@procinix.ai', phone: '+91 98765 43211', department: 'Finance', status: 'Active', approvalStatus: 'Approved' },
    { id: '3', empCode: 'EMP003', empName: 'Amit Patel', email: 'amit.patel@procinix.ai', phone: '+91 98765 43212', department: 'Warehouse', status: 'Active', approvalStatus: 'Approved' },
    { id: '4', empCode: 'EMP004', empName: 'Sneha Verma', email: 'sneha.verma@procinix.ai', phone: '+91 98765 43213', department: 'Quality', status: 'Inactive', approvalStatus: 'Approved' },
    { id: '5', empCode: 'EMP005', empName: 'Vikram Singh', email: 'vikram.singh@procinix.ai', phone: '+91 98765 43214', department: 'Procurement', status: 'Active', approvalStatus: 'Pending Approval' },
  ],
  roles_master: [
    { id: '1', roleCode: 'ADMIN', roleName: 'System Administrator', description: 'Full system access with all privileges', userCount: 1, permissions: ['All Modules', 'User Management', 'System Configuration'], status: 'Active', createdDate: '2024-01-10', approvalStatus: 'Approved' },
    { id: '2', roleCode: 'PO_CREATE', roleName: 'PO Creator', description: 'Can create and submit purchase orders', userCount: 1, permissions: ['Create PO', 'View PO', 'Edit Draft PO'], status: 'Active', createdDate: '2024-01-12', approvalStatus: 'Approved' },
    { id: '3', roleCode: 'PO_APPROVE', roleName: 'PO Approver', description: 'Can approve or reject purchase orders', userCount: 1, permissions: ['Approve PO', 'Reject PO', 'View PO', 'Request More Info'], status: 'Active', createdDate: '2024-01-15', approvalStatus: 'Approved' },
    { id: '4', roleCode: 'GRN_MGR', roleName: 'GRN Manager', description: 'Manages goods receipt process', userCount: 0, permissions: ['Create GRN', 'View GRN', 'Allocate to Locations'], status: 'Active', createdDate: '2024-01-18', approvalStatus: 'Approved' },
    { id: '5', roleCode: 'LOC_MGR', roleName: 'Location Manager', description: 'Accepts allocated goods at location level', userCount: 0, permissions: ['Accept Location Allocation', 'View GRN', 'Reject Allocation'], status: 'Pending Approval', createdDate: '2024-12-10', approvalStatus: 'Pending' },
  ],
  user_master: [
    { id: '1', employeeId: 'EMP001', name: 'Rajesh Kumar', email: 'rajesh.kumar@procinix.ai', phone: '+91 98765 43210', department: 'Procurement', role: 'System Administrator', password: 'admin123', status: 'Active', createdDate: '2024-01-15', approvalStatus: 'Approved' },
    { id: '2', employeeId: 'EMP002', name: 'Priya Sharma', email: 'priya.sharma@procinix.ai', phone: '+91 98765 43211', department: 'Finance', role: 'PO Creator', password: 'creator123', status: 'Active', createdDate: '2024-01-20', approvalStatus: 'Approved' },
    { id: '3', employeeId: 'EMP003', name: 'Amit Patel', email: 'amit.patel@procinix.ai', phone: '+91 98765 43212', department: 'Warehouse', role: 'PO Approver', password: 'approver123', status: 'Active', createdDate: '2024-01-22', approvalStatus: 'Approved' },
    { id: '4', employeeId: 'EMP005', name: 'Vikram Singh', email: 'vikram.singh@procinix.ai', phone: '+91 98765 43214', department: 'Procurement', role: 'GRN Manager', password: 'grn123', status: 'Pending Approval', createdDate: '2024-12-10', approvalStatus: 'Pending' },
  ],
};

async function fetchRecords(masterKey) {
  const response = await fetch(`${baseUrl}/${masterKey}`);
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(`Failed to fetch ${masterKey}`);
  }
  return Array.isArray(payload.data) ? payload.data : [];
}

async function saveRecords(masterKey, records) {
  const response = await fetch(`${baseUrl}/${masterKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(`Failed to save ${masterKey}`);
  }
}

for (const [masterKey, seedRecords] of Object.entries(identitySeedData)) {
  const existingRecords = await fetchRecords(masterKey);
  if (existingRecords.length > 0) {
    console.log(`Skipped ${masterKey}: already has ${existingRecords.length} record(s)`);
    continue;
  }

  await saveRecords(masterKey, seedRecords);
  console.log(`Seeded ${masterKey}: ${seedRecords.length} record(s)`);
}
