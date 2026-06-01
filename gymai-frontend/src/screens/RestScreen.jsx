import { useState, useEffect } from 'react'
import TimerCircle from '../components/svg/TimerCircle.jsx'

const MAX_SECONDS = 120

export default function RestScreen({ go }) {
  const [restSeconds, setRestSeconds] = useState(MAX_SECONDS)

  // Start timer on mount, clear on unmount
  useEffect(() => {
    const id = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(id)
          // Navigate to workout when time is up (deferred to avoid state-in-render)
          setTimeout(() => go('workout'), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id) // cleanup on unmount
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Adjust timer with ±30s buttons
  function adjustTimer(delta) {
    setRestSeconds(prev => Math.max(10, prev + delta))
  }

  // Format seconds → "m:ss"
  const m = Math.floor(restSeconds / 60)
  const s = restSeconds % 60
  const label = `${m}:${s < 10 ? '0' : ''}${s}`

  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('workout')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Descanso activo
        </span>
      </div>

      <div className="screen-body" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          {/* Next exercise header */}
          <div className="label" style={{ marginBottom: '16px', textAlign: 'center' }}>
            Siguiente ejercicio
          </div>

          {/* Next exercise card */}
          <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '20px', marginBottom: '24px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
              Press Inclinado Mancuernas
            </div>
            <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5">
                <rect x="2" y="11" width="20" height="4" rx="2" />
                <line x1="7"  y1="11" x2="7"  y2="7"  />
                <line x1="17" y1="11" x2="17" y2="7"  />
                <line x1="5"  y1="7"  x2="19" y2="7"  />
              </svg>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>3 × 10–12 reps · 28 kg</div>
          </div>

          {/* Circular timer */}
          <div style={{ marginBottom: '24px' }}>
            <TimerCircle
              seconds={restSeconds}
              maxSeconds={MAX_SECONDS}
              label={label}
            />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => adjustTimer(-30)}>−30s</button>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '14px 28px' }}
              onClick={() => go('workout')}
            >
              Saltar descanso
            </button>
            <button className="btn-secondary" onClick={() => adjustTimer(30)}>+30s</button>
          </div>
        </div>
      </div>
    </>
  )
}
