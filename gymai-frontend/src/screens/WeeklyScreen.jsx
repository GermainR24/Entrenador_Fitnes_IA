import { useState } from 'react'

const DAYS = [
  { abbr: 'LUN', label: 'Pecho',    sub: 'Tríceps',   fullDay: 'Lunes',   group: 'Pecho / Tríceps',       exercises: 'Press banca · Fondos · Ext. tríceps',   isRest: false },
  { abbr: 'MAR', label: 'Espalda',  sub: 'Bíceps',    fullDay: 'Martes',  group: 'Espalda / Bíceps',      exercises: 'Dominadas · Remo · Curl bíceps',        isRest: false },
  { abbr: 'MIÉ', label: 'Descanso', sub: 'Recovery',  fullDay: null,      group: null,                    exercises: null,                                    isRest: true  },
  { abbr: 'JUE', label: 'Hombros',  sub: 'Trapecios', fullDay: 'Jueves',  group: 'Hombros / Trapecios',   exercises: 'Press militar · Elevaciones lat.',       isRest: false },
  { abbr: 'VIE', label: 'Piernas',  sub: 'Glúteos',   fullDay: 'Viernes', group: 'Piernas / Glúteos',     exercises: 'Sentadilla · Peso muerto · Prensa',     isRest: false },
  { abbr: 'SÁB', label: 'Core',     sub: 'Cardio',    fullDay: 'Sábado',  group: 'Core / Cardio',         exercises: 'Plancha · Crunch · HIIT 20 min',        isRest: false },
  { abbr: 'DOM', label: 'Descanso', sub: 'Recovery',  fullDay: null,      group: null,                    exercises: null,                                    isRest: true  },
]

export default function WeeklyScreen({ go }) {
  const [selectedIdx, setSelectedIdx] = useState(0) // Monday active by default

  const selected = DAYS[selectedIdx]

  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Vista semanal
        </div>
      </div>

      <div className="screen-body">
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
          Tu split muscular de 7 días. Toca un día para ver el detalle.
        </p>

        {/* Horizontal scroll day cards */}
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', minWidth: 'max-content' }}>
            {DAYS.map((day, i) => (
              <div
                key={day.abbr}
                className={[
                  'day-card',
                  !day.isRest && i === selectedIdx ? 'active-day' : '',
                  day.isRest ? 'rest-day' : '',
                ].join(' ')}
                onClick={() => !day.isRest && setSelectedIdx(i)}
              >
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>
                  {day.abbr}
                </div>
                <div style={{
                  fontSize: '12px', fontWeight: 600,
                  color: !day.isRest && i === selectedIdx ? 'var(--accent)' : day.isRest ? 'var(--text3)' : 'var(--text)',
                }}>
                  {day.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{day.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail card */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '4px' }}>
            {selected.isRest ? 'Descanso — Día libre' : `${selected.fullDay} — Detalle`}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
            {selected.isRest ? 'Recovery activo' : selected.group}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
            {selected.isRest ? 'Movilidad, foam rolling o descanso completo.' : selected.exercises}
          </div>
        </div>

        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => go('dashboard')}>
          Guardar y volver al Dashboard
        </button>
      </div>
    </>
  )
}
