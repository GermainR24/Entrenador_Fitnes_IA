import { useState } from 'react'
import MuscleMap from '../components/svg/MuscleMap.jsx'

// ── Default routine ──────────────────────────────────────────────────────────
const DEFAULT_ROUTINE = [
  { name: 'Press de banca',             sets: '4 × 8–10 reps · 75 kg'        },
  { name: 'Press inclinado mancuernas', sets: '3 × 10–12 reps · 28 kg'       },
  { name: 'Fondos en paralelas',        sets: '3 × 12 reps · Peso corporal'   },
  { name: 'Press francés',              sets: '3 × 12 reps · 20 kg'           },
  { name: 'Extensiones polea alta',     sets: '3 × 15 reps · 15 kg'           },
]

const ALT_ROUTINE = [
  { name: 'Aperturas cable',   sets: '3×12 reps · 12 kg'  },
  { name: 'Pec-deck máquina',  sets: '4×10 reps · 50 kg'  },
  { name: 'Cruce poleas',      sets: '3×15 reps · 10 kg'  },
  { name: 'Press cerrado',     sets: '3×10 reps · 50 kg'  },
  { name: 'Patadas tríceps',   sets: '3×12 reps · 10 kg'  },
]

export default function PlannerScreen({ go }) {
  const [feelVal,   setFeelVal]   = useState(7)
  const [painZones, setPainZones] = useState(new Set())
  const [routine,   setRoutine]   = useState(DEFAULT_ROUTINE)

  // Toggle a muscle zone on/off in the pain set
  function togglePain(id) {
    setPainZones(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function regenRoutine() {
    setRoutine(ALT_ROUTINE)
  }

  const hasPain = painZones.size > 0

  return (
    <>
      {/* Nav bar */}
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <span className="badge badge-amber">Check-in diario</span>
      </div>

      {/* Body */}
      <div className="screen-body">
        {/* Plan title */}
        <div>
          <div className="label" style={{ marginBottom: '4px' }}>Plan de hoy</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700 }}>
            Pecho y Tríceps
          </div>
        </div>

        {/* Feel slider */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>¿Cómo te sientes hoy?</div>
          <input
            type="range"
            className="range-custom"
            min="1" max="10"
            value={feelVal}
            onChange={e => setFeelVal(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Agotado</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
              {feelVal}/10
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Con energía</span>
          </div>
        </div>

        {/* Pain scanner */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Toca si tienes alguna molestia</div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <MuscleMap
              painIds={[...painZones]}
              onToggle={togglePain}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>
                La IA ajustará tu rutina según las zonas marcadas
              </p>
              {hasPain && (
                <div style={{
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#fda4af',
                }}>
                  <strong>⚠ Zona dolorosa detectada.</strong><br />
                  Rutina actualizada automáticamente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI routine */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="label">Rutina generada por IA</div>
            <span className="badge badge-cyan">5 ejercicios</span>
          </div>
          {routine.map((ex, i) => (
            <ExerciseRow
              key={ex.name}
              num={i + 1}
              name={ex.name}
              sets={ex.sets}
              modified={hasPain && i === 1}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" style={{ flex: 2 }} onClick={() => go('scan')}>
            Aceptar y entrenar
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={regenRoutine}>
            Regenerar
          </button>
        </div>
      </div>
    </>
  )
}

// ── Exercise row sub-component ────────────────────────────────────────────────
function ExerciseRow({ num, name, sets, modified }) {
  return (
    <div className={`ex-row${modified ? ' modified' : ''}`}>
      <div className="ex-num">{num}</div>
      <div className="ex-info">
        <div className="name">{name}</div>
        <div className="sets">{sets}</div>
      </div>
    </div>
  )
}
