import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ marginBottom: '16px', fontSize: '48px' }}>!</div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
            An unexpected error occurred. Please refresh the page or navigate back.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
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
              Refresh Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.history.back();
              }}
              style={{
                padding: '8px 20px',
                backgroundColor: 'var(--color-cloud)',
                color: 'var(--color-mercury-grey)',
                border: '1px solid var(--color-silver)',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: '32px',
              padding: '16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#991B1B',
              textAlign: 'left',
              maxWidth: '640px',
              margin: '32px auto 0',
              overflow: 'auto',
            }}>
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
