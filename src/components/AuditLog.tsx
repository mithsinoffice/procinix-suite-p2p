import { History, Search, Filter, Download } from 'lucide-react';

export function AuditLog() {
  return (
    <div style={{ padding: '24px', backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
          Audit Log
        </h1>
        <p style={{ fontSize: '14px', color: '#6E7A82', marginTop: '4px' }}>
          Track all system activities and changes
        </p>
      </div>

      {/* Filters & Search */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E1E6EA', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#6E7A82' }} />
            <input
              type="text"
              placeholder="Search audit logs..."
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '40px',
                paddingRight: '12px',
                border: '1px solid #E1E6EA',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0A0F14',
                backgroundColor: '#F6F9FC'
              }}
            />
          </div>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#F6F9FC',
              border: '1px solid #E1E6EA',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#0A0F14',
              cursor: 'pointer',
              height: '40px'
            }}
          >
            <Filter style={{ width: '14px', height: '14px' }} />
            Filter
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#00A9B7',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#FFFFFF',
              cursor: 'pointer',
              height: '40px'
            }}
          >
            <Download style={{ width: '14px', height: '14px' }} />
            Export
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E1E6EA' }}>
        {/* Table Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E1E6EA' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
            Recent Activities
          </h2>
        </div>

        {/* Table */}
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F6F9FC' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', borderBottom: '1px solid #E1E6EA' }}>
                  Timestamp
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', borderBottom: '1px solid #E1E6EA' }}>
                  User
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', borderBottom: '1px solid #E1E6EA' }}>
                  Action
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', borderBottom: '1px solid #E1E6EA' }}>
                  Module
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6E7A82', borderBottom: '1px solid #E1E6EA' }}>
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Sample Data */}
              {[
                { time: '2024-12-14 10:30:15', user: 'Rajesh Kumar', action: 'Created', module: 'Purchase Order', details: 'PO-2024-0156' },
                { time: '2024-12-14 10:15:42', user: 'Priya Sharma', action: 'Approved', module: 'Invoice', details: 'INV-2024-0891' },
                { time: '2024-12-14 09:45:23', user: 'Amit Patel', action: 'Updated', module: 'Vendor Master', details: 'VEN-0045' },
                { time: '2024-12-14 09:20:11', user: 'Sneha Gupta', action: 'Created', module: 'GRN', details: 'GRN-2024-0234' },
                { time: '2024-12-14 08:55:33', user: 'Vikram Singh', action: 'Rejected', module: 'Payment Batch', details: 'PB-2024-0067' }
              ].map((log, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #E1E6EA' }}>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#0A0F14' }}>
                    {log.time}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#0A0F14' }}>
                    {log.user}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: log.action === 'Approved' ? '#E6F7ED' : log.action === 'Rejected' ? '#FEE2E2' : '#E8F7F8',
                      color: log.action === 'Approved' ? '#059669' : log.action === 'Rejected' ? '#DC2626' : '#00A9B7'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#6E7A82' }}>
                    {log.module}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#6E7A82' }}>
                    {log.details}
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
