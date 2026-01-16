"use client"

export default function LisaChatVisual() {
  return (
    <div 
      className="lisa-chat-visual"
      style={{
        width: '380px',
        maxHeight: '500px',
        overflow: 'hidden',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Lisa's insight message (yellow) */}
      <div
        className="lisa-message insight"
        style={{
          background: '#FEF3C7',
          color: '#DB2777',
          padding: '16px',
          borderRadius: '16px',
          fontWeight: 500,
          lineHeight: 1.5,
          fontSize: '14px'
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>
          <span style={{ fontWeight: 700 }}>Hey!</span> I see you've been tracking for a week now.
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          You logged symptoms <span style={{ fontWeight: 700 }}>6 out of 7 days</span> — that's great consistency!
        </p>
        <p style={{ margin: 0 }}>
          Want to know more about managing hot flashes?
        </p>
      </div>

      {/* User reply (pink, right-aligned) */}
      <div
        className="user-message"
        style={{
          alignSelf: 'flex-end',
          background: '#F472B6',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        yes
      </div>

      {/* Lisa's detailed response (white) */}
      <div
        className="lisa-message response"
        style={{
          background: 'white',
          padding: '16px',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}
      >
        <p
          className="intro"
          style={{
            fontWeight: 600,
            marginBottom: '8px',
            fontSize: '14px',
            color: '#111827'
          }}
        >
          Great question! Here's what research shows: ☀️
        </p>

        <p
          className="explanation"
          style={{
            fontSize: '13px',
            color: '#4B5563',
            marginBottom: '12px',
            lineHeight: 1.5
          }}
        >
          Hot flashes happen when changing estrogen levels affect your body's temperature regulation. Here's what can help:
        </p>

        <div
          className="tips"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div
            className="tip"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: '16px' }}>💧</span>
            <div>
              <span
                className="tip-title"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'block',
                  color: '#111827',
                  marginBottom: '2px'
                }}
              >
                Stay hydrated
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                Drinking water helps regulate body temperature.
              </span>
            </div>
          </div>

          <div
            className="tip"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: '16px' }}>🧊</span>
            <div>
              <span
                className="tip-title"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'block',
                  color: '#111827',
                  marginBottom: '2px'
                }}
              >
                Layer your clothing
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                Easy to remove layers when a hot flash hits.
              </span>
            </div>
          </div>

          <div
            className="tip"
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: '16px' }}>🌿</span>
            <div>
              <span
                className="tip-title"
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'block',
                  color: '#111827',
                  marginBottom: '2px'
                }}
              >
                Try deep breathing
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                Slow breathing can reduce intensity and duration.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fake input field */}
      <div
        className="fake-input"
        style={{
          background: '#F3F4F6',
          color: '#9CA3AF',
          padding: '12px 16px',
          borderRadius: '24px',
          fontSize: '14px',
          marginTop: '8px',
          border: 'none',
          cursor: 'not-allowed'
        }}
      >
        Ask anything...
      </div>
    </div>
  )
}
