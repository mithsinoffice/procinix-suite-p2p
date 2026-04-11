import { CheckCircle, Clock, AlertCircle, Filter } from 'lucide-react';

export function MyTasks() {
  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
          My Tasks
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
          View and manage your assigned tasks
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: '20px', height: '20px', color: 'var(--color-teal)' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>Pending</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: '4px 0 0 0' }}>5</p>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#FFF9E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#D97706' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>Overdue</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: '4px 0 0 0' }}>2</p>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#E6F7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>Completed</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: '4px 0 0 0' }}>18</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--color-silver)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-silver)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
            Active Tasks
          </h2>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--color-ink)',
              cursor: 'pointer'
            }}
          >
            <Filter style={{ width: '14px', height: '14px' }} />
            Filter
          </button>
        </div>

        {/* Empty State */}
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle style={{ width: '24px', height: '24px', color: 'var(--color-mercury-grey)' }} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-ink)', margin: '0 0 8px 0' }}>
            No tasks assigned
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Tasks will appear here when assigned to you
          </p>
        </div>
      </div>
    </div>
  );
}
