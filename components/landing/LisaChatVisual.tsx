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
          <span style={{ fontWeight: 700 }}>Hey!</span> Before we chat — I found 
          something interesting in your logs.
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          Looks like <span style={{ fontWeight: 700 }}>Hot weather</span> appears 
          frequently with your <span style={{ fontWeight: 700 }}>Headaches</span>.
        </p>
        <p style={{ margin: 0 }}>
          Want me to explain what this means?
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
          Alright, here's the scoop! ☀️
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
          When it's hot, your body works overtime to stay cool, which can lead to 
          dehydration and headaches. Plus, hormonal changes during menopause make you 
          more sensitive to heat.
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
                Hydrate, hydrate, hydrate
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                Drink more water on hot days.
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
                Cool yourself down
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                A cold pack on your forehead helps.
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
                Stress management
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                Try deep breathing or gentle yoga.
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
