import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div
        style={{
          fontSize: '64px',
          fontWeight: 700,
          color: 'var(--color-silver)',
          marginBottom: '8px',
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          marginBottom: '8px',
        }}
      >
        Page not found
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', marginBottom: '24px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '8px 20px',
          backgroundColor: 'var(--color-teal)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
