import { useState, useEffect } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'

const DAYS = [
  { abbr: 'LUN', label: 'Pecho',    sub: 'Tríceps',   fullDay: 'Lunes',   group: 'Pecho / Tríceps',       exercises: 'Press banca · Fondos · Ext. tríceps',   isRest: false },
  { abbr: 'MAR', label: 'Espalda',  sub: 'Bíceps',    fullDay: 'Martes',  group: 'Espalda / Bíceps',      exercises: 'Dominadas · Remo · Curl bíceps',        isRest: false },
  { abbr: 'MIÉ', label: 'Descanso', sub: 'Recovery',  fullDay: 'Miércoles', group: null,                    exercises: null,                                    isRest: true  },
  { abbr: 'JUE', label: 'Hombros',  sub: 'Trapecios', fullDay: 'Jueves',  group: 'Hombros / Trapecios',   exercises: 'Press militar · Elevaciones lat.',       isRest: false },
  { abbr: 'VIE', label: 'Piernas',  sub: 'Glúteos',   fullDay: 'Viernes', group: 'Piernas / Glúteos',     exercises: 'Sentadilla · Peso muerto · Prensa',     isRest: false },
  { abbr: 'SÁB', label: 'Core',     sub: 'Cardio',    fullDay: 'Sábado',  group: 'Core / Cardio',         exercises: 'Plancha · Crunch · HIIT 20 min',        isRest: false },
  { abbr: 'DOM', label: 'Descanso', sub: 'Recovery',  fullDay: 'Domingo',   group: null,                    exercises: null,                                    isRest: true  },
]

const DAY_NAME_TO_INDEX = {
  'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2,
  'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5, 'domingo': 6,
}

export default function WeeklyScreen({ go }) {
  const [selectedIdx, setSelectedIdx] = useState(0) 
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  const selected = DAYS[selectedIdx]

  // ── Control de Voz Estabilizado (Sin selectedIdx en las dependencias) ───
  useEffect(() => {
    const commands = {
      // Redirecciones
      'volver': () => go('dashboard'),
      'atrás': () => go('dashboard'),
      'guardar': () => go('dashboard'),
      'salir': () => go('dashboard'),

      // Mapeo dinámico de los días de la semana
      ...Object.entries(DAY_NAME_TO_INDEX).reduce((acc, [name, idx]) => {
        acc[name] = () => setSelectedIdx(idx) // 🟢 Corregido: Ahora sí permite ver detalles de descansos
        return acc
      }, {}),

      // Navegación secuencial usando actualizaciones funcionales seguras
      'siguiente día': () => setSelectedIdx(prev => (prev + 1) % DAYS.length),
      'siguiente': () => setSelectedIdx(prev => (prev + 1) % DAYS.length),
      'día anterior': () => setSelectedIdx(prev => (prev - 1 + DAYS.length) % DAYS.length),
      'anterior': () => setSelectedIdx(prev => (prev - 1 + DAYS.length) % DAYS.length),
    }

    // Modo continuo fluido sin caídas de hilo
    listenForCommands(commands, true)
    
    return () => stopListening()
  }, [listenForCommands, stopListening, go]) // 🟢 Totalmente estable

  return (
    <>
      {/* Barra superior con indicador de micrófono */}
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Vista semanal
        </div>
        {isListening && (
          <span style={{ marginLeft: 'auto', backgroundColor: '#22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🎤</span> Escuchando
          </span>
        )}
      </div>

      <div className="screen-body">
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
          Tu split muscular de 7 días. Toca un día para ver el detalle.
          {isListening && <span style={{ color: '#4ade80', marginLeft: '6px' }}>🎤 Escuchando comandos...</span>}
        </p>

        {/* Carrusel horizontal de días */}
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', minWidth: 'max-content' }}>
            {DAYS.map((day, i) => (
              <div
                key={day.abbr}
                className={[
                  'day-card',
                  i === selectedIdx ? 'active-day' : '',
                  day.isRest ? 'rest-day' : '',
                ].join(' ')}
                onClick={() => setSelectedIdx(i)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>
                  {day.abbr}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: i === selectedIdx ? 'var(--accent)' : day.isRest ? 'var(--text3)' : 'var(--text)' }}>
                  {day.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{day.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta de detalle del día */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '4px' }}>
            {selected.isRest ? 'Descanso — Día libre' : `${selected.fullDay} — Detalle`}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
            {selected.isRest ? 'Recovery activo' : selected.group}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
            {selected.isRest ? 'Movilidad, foam rolling o descanso completo para reparar fibras.' : selected.exercises}
          </div>
        </div>

        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => go('dashboard')}>
          Guardar y volver al Dashboard
        </button>

        {/* Ayuda de comandos */}
        {isListening && (
          <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--text3)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '20px', textAlign: 'center' }}>
            🗣️ Di: "lunes", "martes", "siguiente", "anterior" o "volver"
          </div>
        )}
      </div>
    </>
  )
}