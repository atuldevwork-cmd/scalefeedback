'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            background: '#f9f9fb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '0 16px',
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: '#ff724f',
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#fff',
                fontSize: 14,
                marginBottom: 6,
              }}
            >
              SF
            </div>
            <p style={{ color: '#300a46', fontWeight: 700, fontSize: 16, margin: 0 }}>
              ScaleFeedback
            </p>
          </div>

          <p
            style={{
              fontSize: 120,
              fontWeight: 700,
              lineHeight: 1,
              margin: '0 0 16px',
              background: 'linear-gradient(135deg, #300a46 0%, #ff724f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            500
          </p>

          <h1 style={{ color: '#300a46', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, maxWidth: 300, margin: '0 auto 28px' }}>
            A critical error occurred. Please try again or contact support if the issue persists.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                background: '#ff724f',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                padding: '8px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/projects"
              style={{
                background: '#fff',
                color: '#300a46',
                fontWeight: 600,
                fontSize: 14,
                padding: '8px 20px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                textDecoration: 'none',
              }}
            >
              Go to Dashboard
            </a>
          </div>

          <p style={{ position: 'fixed', bottom: 24, color: '#9ca3af', fontSize: 12 }}>
            ScaleFeedback by ScaleStation
          </p>
        </div>
      </body>
    </html>
  );
}
