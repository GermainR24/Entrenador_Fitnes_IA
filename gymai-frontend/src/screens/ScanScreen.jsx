export default function ScanScreen({ go }) {
  return (
    <div style={{ position: 'relative', flex: 1, background: 'linear-gradient(160deg,#0d1117,#0f1a14)', overflow: 'hidden' }}>
      {/* Scan grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(74,222,128,0.025) 40px,rgba(74,222,128,0.025) 41px),
          repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(74,222,128,0.025) 40px,rgba(74,222,128,0.025) 41px)
        `,
      }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
        <button className="back-btn" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => go('planner')}>
          ← Volver
        </button>
        <span className="badge badge-green" style={{ background: 'rgba(0,0,0,0.6)' }}>IA activa</span>
      </div>

      {/* Center content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 2 }}>
        {/* Viewfinder */}
        <div style={{ position: 'relative', width: '80%', maxWidth: '300px', aspectRatio: '4/3', border: '2px solid rgba(74,222,128,0.45)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.3)" strokeWidth="1">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div className="bbox" style={{ top: '18%', left: '12%' }}>Mancuernas detectadas</div>
          <div className="bbox" style={{ bottom: '16%', right: '8%' }}>Banco detectado</div>
        </div>

        {/* Status */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--accent2)' }}>
            Analizando equipamiento... Todo listo.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
            2 elementos detectados en tu entorno
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', padding: '0 24px', width: '100%' }}>
          <button className="btn-primary" style={{ flex: 2 }} onClick={() => go('workout')}>
            Confirmar y entrenar
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('dashboard')}>
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}
