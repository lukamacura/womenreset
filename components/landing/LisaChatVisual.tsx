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
      {/* User question (pink, right-aligned) */}
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
        Why do I wake up at 3am every night?
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
          Great question! 🌙 This is super common in perimenopause. Here's what's happening:
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
          Your progesterone levels are dropping, and progesterone helps you stay asleep. Lower levels = more middle-of-the-night wake-ups.
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
                Keep your room cool
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                65-68°F (18-20°C) helps your body stay asleep.
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
                Skip alcohol after 6pm
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                It disrupts deep sleep cycles.
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
                Try magnesium glycinate before bed
              </span>
              <span
                className="tip-text"
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'block'
                }}
              >
                Can help with sleep quality and duration.
              </span>
            </div>
          </div>
        </div>
        
        <p
          style={{
            fontSize: '13px',
            color: '#DB2777',
            fontWeight: 600,
            marginTop: '12px',
            marginBottom: 0
          }}
        >
          Want me to explain more about the progesterone connection?
        </p>
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
