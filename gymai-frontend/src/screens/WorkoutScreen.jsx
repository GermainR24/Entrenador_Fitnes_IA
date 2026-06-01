import MuscleMap  from '../components/svg/MuscleMap.jsx'
import WaveAudio  from '../components/shared/WaveAudio.jsx'

export default function WorkoutScreen({ go }) {
  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('scan')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700 }}>
          Entrenamiento
        </span>
        <span className="badge badge-green">En vivo</span>
      </div>

      <div className="screen-body">
        {/* Exercise title */}
        <div>
          <div className="label" style={{ marginBottom: '4px' }}>Músculo activo</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700 }}>
            Press de Banca{' '}
            <span style={{ color: 'var(--text3)', fontSize: '14px' }}>· Serie 2/4</span>
          </div>
        </div>

        {/* Two-column: muscle map + camera/audio */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Muscle map column */}
          <div
            className="glass"
            style={{ borderRadius: 'var(--r2)', padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
          >
            <div className="label" style={{ fontSize: '9px' }}>Mapa activo</div>
            <MuscleMap activeIds={['chest']} />
          </div>

          {/* Camera + audio column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Camera / pose skeleton */}
            <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '12px' }}>
              <div className="label" style={{ fontSize: '9px', marginBottom: '6px' }}>Cámara + pose</div>
              <div style={{ aspectRatio: '3/4', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PoseSkeleton />
              </div>
            </div>

            {/* Audio wave */}
            <div className="glass" style={{ borderRadius: '10px', padding: '10px' }}>
              <div className="label" style={{ fontSize: '9px', marginBottom: '6px' }}>Audio IA</div>
              <WaveAudio barCount={8} />
            </div>
          </div>
        </div>

        {/* Correction card */}
        <div className="correction-card">
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent3)' }}>Corrección postural</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
              Baja más la cadera — mantén la espalda recta
            </div>
          </div>
        </div>

        {/* Main actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('blind')}>
            Pantalla apagada
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => go('rest')}>
            Terminé serie →
          </button>
        </div>

        {/* End session */}
        <button
          className="btn-secondary"
          style={{ width: '100%', borderColor: 'rgba(244,63,94,0.3)', color: '#f43f5e' }}
          onClick={() => go('history')}
        >
          Finalizar sesión
        </button>
      </div>
    </>
  )
}

// ── Stick-figure pose skeleton ─────────────────────────────────────────────
function PoseSkeleton() {
  return (
    <svg width="36" height="60" viewBox="0 0 36 60" fill="none">
      <circle cx="18" cy="6"  r="4"   stroke="#22d3ee" strokeWidth="1.5" />
      <line   x1="18" y1="10" x2="18" y2="28" stroke="#22d3ee" strokeWidth="1.5" />
      <line   x1="18" y1="16" x2="6"  y2="24" stroke="#22d3ee" strokeWidth="1.5" />
      <line   x1="18" y1="16" x2="30" y2="24" stroke="#22d3ee" strokeWidth="1.5" />
      <line   x1="18" y1="28" x2="10" y2="48" stroke="#22d3ee" strokeWidth="1.5" />
      <line   x1="18" y1="28" x2="26" y2="48" stroke="#22d3ee" strokeWidth="1.5" />
      <circle cx="6"  cy="24" r="2.5" stroke="#22d3ee" strokeWidth="1.2" />
      <circle cx="30" cy="24" r="2.5" stroke="#22d3ee" strokeWidth="1.2" />
    </svg>
  )
}
