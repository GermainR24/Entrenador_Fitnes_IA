import { useState, useEffect, useCallback } from 'react'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'

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

const VOICE_MUSCLE_MAP = {
  'pecho': 'chest', 'hombro': 'deltoids', 'hombros': 'deltoids',
  'bíceps': 'biceps', 'bicep': 'biceps', 'tríceps': 'triceps', 'tricep': 'triceps',
  'antebrazo': 'forearm', 'brazo': 'forearm', 'mano': 'hands', 'manos': 'hands',
  'cuello': 'neck', 'trapecio': 'trapezius', 'espalda alta': 'upper-back',
  'espalda baja': 'lower-back', 'lumbar': 'lower-back', 'abdomen': 'abs',
  'abdominales': 'abs', 'oblicuo': 'obliques', 'glúteo': 'gluteal', 'glúteos': 'gluteal',
  'aductores': 'adductors', 'isquiotibiales': 'hamstring', 'pierna trasera': 'hamstring',
  'pantorrilla': 'calves', 'pantorrillas': 'calves', 'pie': 'feet', 'pies': 'feet',
  'cuádriceps': 'quadriceps', 'cuadriceps': 'quadriceps', 'rodilla': 'knees', 'rodillas': 'knees',
  'tibial': 'tibialis', 'tobillo': 'ankles', 'tobillos': 'ankles',
}

export default function PlannerScreen({ go }) {
  const [feelVal, setFeelVal] = useState(7)
  const [painZones, setPainZones] = useState(new Set())
  const [routine, setRoutine] = useState(DEFAULT_ROUTINE)
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()


  const addPainZone = useCallback((slug) => {
    setPainZones(prev => new Set([...prev, slug]))
  }, [])

  const removePainZone = useCallback((slug) => {
    setPainZones(prev => {
      const next = new Set(prev)
      next.delete(slug)
      return next
    })
  }, [])

  const togglePain = useCallback((slug) => {
    setPainZones(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }, [])

  const clearPainZones = useCallback(() => setPainZones(new Set()), [])

  const regenRoutine = useCallback(() => {
    setRoutine(prev => prev === DEFAULT_ROUTINE ? ALT_ROUTINE : DEFAULT_ROUTINE)
  }, [])

  const hasPain = painZones.size > 0

  // ── Comandos de Voz Estabilizados ───────────────────────────────────────────
  useEffect(() => {
    const commands = {
      'volver': () => go('dashboard'),
      'atrás': () => go('dashboard'),
      'dashboard': () => go('dashboard'),
      'aceptar': () => go('scan'),
      'entrenar': () => go('scan'),
      'empezar': () => go('scan'),
      'regenerar': () => regenRoutine(),
      'cambiar rutina': () => regenRoutine(),
      'otra rutina': () => regenRoutine(),

      'más energía': () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'subir nivel': () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'subir': () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'menos energía': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      'bajar nivel': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      'bajar': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      
      'limpiar dolores': () => clearPainZones(),
      'sin dolor': () => clearPainZones(),


      ...Object.keys(VOICE_MUSCLE_MAP).reduce((acc, keyword) => {
        const slug = VOICE_MUSCLE_MAP[keyword]
        acc[`me duele el ${keyword}`] = () => addPainZone(slug)
        acc[`me duele la ${keyword}`] = () => addPainZone(slug)
        acc[`me duele ${keyword}`] = () => addPainZone(slug)
        acc[`dolor en ${keyword}`] = () => addPainZone(slug)
        acc[`quitar dolor ${keyword}`] = () => removePainZone(slug)
        return acc
      }, {})
    }

    // Inyección de comandos numéricos
    for (let i = 1; i <= 10; i++) {
      commands[`poner nivel ${i}`] = () => setFeelVal(i)
      commands[`nivel ${i}`] = () => setFeelVal(i)
    }

    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening, go, addPainZone, removePainZone, clearPainZones, regenRoutine])

  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <span className="badge badge-amber">Check-in diario</span>
        {isListening && (
          <span style={{ marginLeft: 'auto', backgroundColor: '#22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🎤</span> Escuchando
          </span>
        )}
      </div>

      <div className="screen-body">
        <div>
          <div className="label" style={{ marginBottom: '4px' }}>Plan de hoy</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700 }}>
            Pecho y Tríceps
          </div>
        </div>

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
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{feelVal}/10</span>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Con energía</span>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Toca si tienes alguna molestia</div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <HombreFrontal
              activeIds={mapIdsToSlugs([...painZones])}
              onMuscleClick={togglePain}
              width={180}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>
                La IA ajustará tu rutina según las zonas marcadas
              </p>
              {hasPain && (
                <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#fda4af' }}>
                  <strong>⚠ Zona dolorosa detectada.</strong><br />
                  Rutina actualizada automáticamente.
                </div>
              )}
              {isListening && (
                <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text3)', background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '8px' }}>
                  🗣️ Di: "me duele el pecho", "dolor en hombro", "quitar dolor cuello", "limpiar dolores"
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="label">Rutina generada por IA</div>
            <span className="badge badge-cyan">{routine.length} ejercicios</span>
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