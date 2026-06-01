import { useState } from 'react'
import WaveAudio from '../components/shared/WaveAudio.jsx'

export default function BlindScreen({ go }) {
  const [isListening, setIsListening] = useState(false)

  function activateMic() {
    setIsListening(true)
    setTimeout(() => setIsListening(false), 2500)
  }

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '28px', background: '#000', position: 'relative' }}
      onClick={activateMic}
    >
      {/* Settings icon — top-right */}
      <div
        style={{ position: 'absolute', top: '16px', right: '16px', cursor: 'pointer', opacity: 0.45 }}
        onClick={e => { e.stopPropagation(); go('dashboard') }}
        title="Cambiar a modo visual"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </div>

      {/* Mic button */}
      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="mic-pulse" style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(74,222,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', maxWidth: '260px' }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
          {isListening ? 'Procesando...' : 'Modo audio activado'}
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginTop: '10px', lineHeight: 1.7 }}>
          Toca cualquier parte de la pantalla para hablar
        </p>
      </div>

      {/* Listening wave */}
      {isListening && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 24px', textAlign: 'center' }}>
          <WaveAudio barCount={5} style={{ justifyContent: 'center', marginBottom: '8px' }} />
          <span style={{ fontSize: '13px', color: '#4ade80' }}>Escuchando...</span>
        </div>
      )}

      {/* Visual mode fallback */}
      <div style={{ position: 'absolute', bottom: '24px', width: '100%', padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={e => { e.stopPropagation(); go('dashboard') }}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50px', padding: '10px 24px', color: 'rgba(255,255,255,0.35)', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          Cambiar a modo visual
        </button>
      </div>
    </div>
  )
}
