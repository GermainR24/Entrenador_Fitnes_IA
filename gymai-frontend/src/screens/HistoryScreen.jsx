import { useState } from 'react'
import ProgressChart from '../components/svg/ProgressChart.jsx'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'

// Chart data per exercise
const EXERCISES = [
  'Press de banca',
  'Sentadilla hack',
  'Peso muerto',
  'Curl bíceps',
  'Elevaciones laterales',
]

const CHART_POINTS = [
  '0,65 50,55 100,45 150,40 200,28 250,22 300,15',
  '0,70 50,60 100,52 150,42 200,36 250,30 300,20',
  '0,60 50,52 100,44 150,38 200,30 250,24 300,12',
  '0,72 50,65 100,56 150,48 200,40 250,35 300,26',
  '0,68 50,58 100,48 150,40 200,32 250,24 300,16',
]

export default function HistoryScreen({ go }) {
  const [exIdx, setExIdx] = useState(0)

  function changeExercise(delta) {
    setExIdx(prev => (prev + delta + EXERCISES.length) % EXERCISES.length)
  }

  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Historial
        </span>
      </div>

      <div className="screen-body">
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatCard value="24"   label="Sesiones"  color="74,222,128"  />
          <StatCard value="+18%" label="Progreso"  color="34,211,238"  />
          <StatCard value="7🔥"  label="Racha"     color="245,158,11"  />
        </div>

        {/* Progress chart */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div className="label" style={{ marginBottom: '2px' }}>Progreso de carga</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 600 }}>
                {EXERCISES[exIdx]}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '14px' }}
                onClick={() => changeExercise(-1)}
              >‹</button>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '14px' }}
                onClick={() => changeExercise(1)}
              >›</button>
            </div>
          </div>

          <ProgressChart points={CHART_POINTS[exIdx]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            {['Ene','Feb','Mar','Abr','May'].map(m => (
              <span key={m} style={{ fontSize: '11px', color: 'var(--text3)' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Cumulative muscle map */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: '8px' }}>Volumen muscular acumulado</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HombreFrontal
              activeIds={mapIdsToSlugs(['chest', 'lshoulder', 'rshoulder', 'lquad', 'rquad'])}
              width={200}
            />
          </div>
        </div>

        {/* XP achievement */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px', textAlign: 'center', borderColor: 'rgba(74,222,128,0.3)' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>🏆</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
            ¡Has ganado +50 XP por constancia!
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
            7 días seguidos entrenando
          </div>
        </div>

        <button className="btn-primary" onClick={() => go('dashboard')}>
          Volver al inicio
        </button>
      </div>
    </>
  )
}

// ── Stat card sub-component ──────────────────────────────────────────────────
function StatCard({ value, label, color }) {
  return (
    <div style={{
      flex: 1,
      background: `rgba(${color},0.08)`,
      border: `1px solid rgba(${color},0.2)`,
      borderRadius: '12px',
      padding: '12px',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, color: `rgb(${color})` }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}
