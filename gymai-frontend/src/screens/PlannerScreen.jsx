import { useState, useEffect, useCallback, useRef } from 'react'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'

const DEFAULT_ROUTINE = [
  { name: 'Press de banca',             sets_description: '4 × 8–10 reps · 75 kg',       is_modified: false },
  { name: 'Press inclinado mancuernas', sets_description: '3 × 10–12 reps · 28 kg',      is_modified: false },
  { name: 'Fondos en paralelas',        sets_description: '3 × 12 reps · Peso corporal',  is_modified: false },
  { name: 'Press francés',              sets_description: '3 × 12 reps · 20 kg',           is_modified: false },
  { name: 'Extensiones polea alta',     sets_description: '3 × 15 reps · 15 kg',           is_modified: false },
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
  
  // 🟢 Nuevos estados para la conexión con el Backend de FastAPI
  const [loading, setLoading] = useState(false)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [errorApi, setErrorApi] = useState(null)

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

  // ── 🚀 NUEVA FUNCIÓN: Conexión asíncrona con el Servidor FastAPI ────────────────
  const generarRutinaAdaptada = useCallback(async () => {
    setLoading(true)
    setErrorApi(null)
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
      
      // Construimos el body exacto que espera tu CheckInRequest de SQLModel
      const payload = {
        feel_value: feelVal,
        pain_zones: [...painZones] // Convertimos el Set de React a un Array plano de strings
      }

      const response = await fetch(`${API_BASE}/routines/adapt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('No se pudo obtener la rutina adaptada del servidor.')
      }

      const data = await response.json() // Mapea a RoutineResponse
      
      setRoutine(data.exercises)   // Reemplaza la rutina estática por la calculada por el LLM
      setAiFeedback(data.ai_feedback) // Almacena el mensaje explicativo de la IA
    } catch (err) {
      setErrorApi(err.message || 'Error de comunicación con el backend.')
    } finally {
      setLoading(false)
    }
  }, [feelVal, painZones])

  const hasPain = painZones.size > 0

  // Guardamos las referencias mutables para evitar re-renders del micrófono
  const actionsRef = useRef(null)
  actionsRef.current = { generarRutinaAdaptada, go, addPainZone, removePainZone, clearPainZones }

  // ── Comandos de Voz ─────────────────────────────────────────────────────────
  useEffect(() => {
    const commands = {
      'volver': () => actionsRef.current.go('dashboard'),
      'atrás': () => actionsRef.current.go('dashboard'),
      'dashboard': () => actionsRef.current.go('dashboard'),
      
      'aceptar': () => actionsRef.current.go('scan'),
      'entrenar': () => actionsRef.current.go('scan'),
      'empezar': () => actionsRef.current.go('scan'),
      
      // Comandos de voz mapeados a la nueva función asíncrona del backend
      'generar rutina': () => actionsRef.current.generarRutinaAdaptada(),
      'actualizar rutina': () => actionsRef.current.generarRutinaAdaptada(),
      'calcular': () => actionsRef.current.generarRutinaAdaptada(),
      'adaptar': () => actionsRef.current.generarRutinaAdaptada(),

      'más energía': () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'subir nivel': () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'menos energía': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      'bajar nivel': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      
      'limpiar dolores': () => actionsRef.current.clearPainZones(),
      'sin dolor': () => actionsRef.current.clearPainZones(),

      ...Object.keys(VOICE_MUSCLE_MAP).reduce((acc, keyword) => {
        const slug = VOICE_MUSCLE_MAP[keyword]
        acc[`me duele el ${keyword}`] = () => actionsRef.current.addPainZone(slug)
        acc[`me duele la ${keyword}`] = () => actionsRef.current.addPainZone(slug)
        acc[`me duele ${keyword}`] = () => actionsRef.current.addPainZone(slug)
        acc[`dolor en ${keyword}`] = () => actionsRef.current.addPainZone(slug)
        acc[`quitar dolor ${keyword}`] = () => actionsRef.current.removePainZone(slug)
        return acc
      }, {})
    }

    for (let i = 1; i <= 10; i++) {
      commands[`poner nivel ${i}`] = () => setFeelVal(i)
      commands[`nivel ${i}`] = () => setFeelVal(i)
    }

    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening])

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

      <div className="screen-body" style={{ paddingBottom: '30px' }}>
        <div>
          <div className="label" style={{ marginBottom: '4px' }}>Plan de hoy</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700 }}>
            Pecho y Tríceps
          </div>
        </div>

        {/* Slider de energía */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>¿Cómo te sientes hoy?</div>
          <input
            type="range"
            className="range-custom"
            min="1" max="10"
            value={feelVal}
            onChange={e => setFeelVal(Number(e.target.value))}
            disabled={loading}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Agotado</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{feelVal}/10</span>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Con energía</span>
          </div>
        </div>

        {/* Mapa anatómico */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Toca si tienes alguna molestia</div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <HombreFrontal
              activeIds={mapIdsToSlugs([...painZones])}
              onMuscleClick={loading ? null : togglePain}
              width={180}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>
                La IA ajustará tu rutina según las zonas marcadas
              </p>
              {hasPain && (
                <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#fda4af' }}>
                  <strong>⚠ Zonas de molestia marcadas.</strong><br />
                  Presiona el botón de abajo para recalcular tu rutina.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🟢 NUEVA TARJETA: Feedback Explicativo del LLM (Solo aparece si el servidor responde) */}
        {aiFeedback && !loading && (
          <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px', borderLeft: '4px solid #4ade80', background: 'rgba(74,222,128,0.03)' }}>
            <div className="label" style={{ fontSize: '10px', color: '#4ade80', marginBottom: '6px' }}>Análisis de Adaptación de GymAI</div>
            <p style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
              {aiFeedback}
            </p>
          </div>
        )}

        {/* Alerta de error en peticiones */}
        {errorApi && (
          <div style={{ color: '#f43f5e', fontSize: '12px', textAlign: 'center', background: 'rgba(244,63,94,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>
            ⚠️ {errorApi}
          </div>
        )}

        {/* Bloque de Rutina */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="label">Rutina de Entrenamiento</div>
            <span className="badge badge-cyan" style={{ background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(6,182,212,0.15)' }}>
              {loading ? '...' : `${routine.length} ejercicios`}
            </span>
          </div>

          {/* Efecto de desvanecimiento por carga */}
          <div style={{ opacity: loading ? 0.35 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {routine.map((ex, i) => (
              <ExerciseRow
                key={ex.name + i}
                num={i + 1}
                name={ex.name}
                // Adaptado al contrato del backend (soporta el string local o el sets_description de FastAPI)
                sets={ex.sets_description || ex.sets}
                // Bandera directa mapeada desde tu JSON de Python
                modified={ex.is_modified}
              />
            ))}
          </div>

          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--accent)', background: '#12161a', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                Recalculando con IA...
              </span>
            </div>
          )}
        </div>

        {/* BOTONES DE ACCIÓN PRINCIPALES */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button className="btn-primary" style={{ flex: 1.8 }} onClick={() => go('scan')} disabled={loading}>
            Aceptar y entrenar
          </button>
          
          <button 
            className="btn-secondary" 
            style={{ 
              flex: 1.2, 
              border: hasPain && !aiFeedback ? '1px solid rgba(74,222,128,0.4)' : '1px solid var(--border2)',
              color: hasPain && !aiFeedback ? '#4ade80' : 'var(--text)' 
            }} 
            onClick={generarRutinaAdaptada} 
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Generar con IA ✨'}
          </button>
        </div>
      </div>
    </>
  )
}

function ExerciseRow({ num, name, sets, modified }) {
  return (
    <div className={`ex-row${modified ? ' modified' : ''}`} style={{ borderLeft: modified ? '3px solid #f59e0b' : 'none' }}>
      <div className="ex-num">{num}</div>
      <div className="ex-info">
        <div className="name" style={{ color: modified ? '#fdba74' : 'var(--text)' }}>
          {name} {modified && <span style={{ fontSize: '10px', color: '#f59e0b', marginLeft: '4px' }}>(IA Modificó)</span>}
        </div>
        <div className="sets">{sets}</div>
      </div>
    </div>
  )
}