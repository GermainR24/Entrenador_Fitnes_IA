import { useState, useEffect, useCallback, useRef } from 'react'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'
import { useWorkout } from '../context/WorkoutContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const VOICE_MUSCLE_MAP = {
  'pecho': 'chest', 'hombro': 'deltoids', 'hombros': 'deltoids',
  'bíceps': 'biceps', 'bicep': 'biceps', 'tríceps': 'triceps', 'tricep': 'triceps',
  'antebrazo': 'forearm', 'brazo': 'forearm', 'mano': 'hands', 'manos': 'hands',
  'cuello': 'neck', 'trapecio': 'trapezius', 'espalda alta': 'upper-back',
  'espalda baja': 'lower-back', 'lumbar': 'lower-back', 'abdomen': 'abs',
  'abdominales': 'abs', 'oblicuo': 'obliques', 'glúteo': 'gluteal', 'glúteos': 'gluteal',
  'aductores': 'adductors', 'isquiotibiales': 'hamstring', 'pierna trasera': 'hamstring',
  'pantorrilla': 'calves', 'pantorrillas': 'calves', 'pie': 'feet', 'pies': 'feet',
  'cuádriceps': 'quadriceps', 'cuadriceps': 'quadriceps', 'rodilla': 'knees',
  'tibial': 'tibialis', 'tobillo': 'ankles', 'tobillos': 'ankles',
}

// Días de la semana en español para el saludo de voz
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function PlannerScreen({ go }) {
  const [feelVal,    setFeelVal]    = useState(7)
  const [painZones,  setPainZones]  = useState(new Set())
  const [routine,    setRoutine]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [errorApi,   setErrorApi]   = useState(null)
  const [dayLabel,   setDayLabel]   = useState('Cargando...')  // ← dinámico

  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const commandsRef = useRef(null)
  const { startSession } = useWorkout()
  const { authFetch } = useAuth()

  // Día actual para mostrar en UI
  const diaHoy = DIAS_SEMANA[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

  // ── Síntesis de voz ─────────────────────────────────────────────────────────
  const speak = useCallback((text, onComplete = null) => {
    window.speechSynthesis.cancel()
    stopListening()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-PE'
    utterance.rate = 0.98
    utterance.onend = () => {
      if (onComplete) onComplete()
      else if (commandsRef.current) listenForCommands(commandsRef.current, true)
    }
    window.speechSynthesis.speak(utterance)
  }, [listenForCommands, stopListening])

  const addPainZone    = useCallback((slug) => setPainZones(prev => new Set([...prev, slug])), [])
  const removePainZone = useCallback((slug) => setPainZones(prev => { const n = new Set(prev); n.delete(slug); return n }), [])
  const togglePain     = useCallback((slug) => setPainZones(prev => { const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n }), [])
  const clearPainZones = useCallback(() => setPainZones(new Set()), [])

  // ── Carga inicial: obtener rutina base del día sin llamar a la IA ───────────
  useEffect(() => {
    async function cargarRutinaBase() {
      try {
        // Llamamos con feel_value=8 y sin pain_zones para que el backend
        // devuelva la rutina base del día sin adaptar (lógica de eficiencia)
        const res = await authFetch('/routines/adapt', {
          method: 'POST',
          body: JSON.stringify({ feel_value: 8, pain_zones: [] }),
        })
        if (res.ok) {
          const data = await res.json()
          setRoutine(data.exercises)
          if (data.day_label) setDayLabel(data.day_label)
          speak(
            `Bienvenido a tu check-in del ${diaHoy}. ` +
            `Tu rutina de hoy es ${data.day_label ?? 'entrenamiento'}. ` +
            `Ajusta tu energía o indícame qué músculos te molestan.`
          )
        }
      } catch (err) {
        console.error('Error cargando rutina base:', err)
        speak(`Bienvenido a tu check-in del ${diaHoy}. Ajusta tu energía antes de entrenar.`)
      }
    }
    cargarRutinaBase()
    return () => window.speechSynthesis.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Llamada a la IA para adaptar la rutina ──────────────────────────────────
  const generarRutinaAdaptada = useCallback(async () => {
    setLoading(true)
    setErrorApi(null)
    try {
      const res = await authFetch('/routines/adapt', {
        method: 'POST',
        body: JSON.stringify({ feel_value: feelVal, pain_zones: [...painZones] }),
      })
      if (!res.ok) throw new Error('No se pudo obtener la rutina adaptada.')
      const data = await res.json()
      setRoutine(data.exercises)
      setAiFeedback(data.ai_feedback)
      if (data.day_label) setDayLabel(data.day_label)

      const ejerciciosHablados = data.exercises.map((ex, i) => {
        const texto = (ex.sets_description || '')
          .replace(/×/g, 'series de').replace(/–/g, 'a').replace(/-/g, 'a').replace(/reps/g, 'repeticiones')
        return `Ejercicio ${i + 1}: ${ex.name}. ${texto}.`
      }).join(' ')

      speak(
        `${data.ai_feedback ?? 'Rutina adaptada.'} ` +
        `${ejerciciosHablados} Di "aceptar" para iniciar.`
      )
    } catch (err) {
      setErrorApi(err.message || 'Error de comunicación con el backend.')
      speak('Hubo un error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }, [feelVal, painZones, speak, authFetch])

  // ── Aceptar y entrenar ───────────────────────────────────────────────────────
  const aceptarYEntrenar = useCallback(() => {
    startSession(routine, feelVal, [...painZones])
    go('workout')
  }, [routine, feelVal, painZones, startSession, go])

  const hasPain = painZones.size > 0
  const actionsRef = useRef(null)
  actionsRef.current = { generarRutinaAdaptada, aceptarYEntrenar, go, addPainZone, removePainZone, clearPainZones }

  // ── Comandos de voz ──────────────────────────────────────────────────────────
  useEffect(() => {
    const commands = {
      'volver':   () => actionsRef.current.go('dashboard'),
      'atrás':    () => actionsRef.current.go('dashboard'),
      'aceptar':  () => actionsRef.current.aceptarYEntrenar(),
      'entrenar': () => actionsRef.current.aceptarYEntrenar(),
      'empezar':  () => actionsRef.current.aceptarYEntrenar(),
      'generar rutina':    () => actionsRef.current.generarRutinaAdaptada(),
      'actualizar rutina': () => actionsRef.current.generarRutinaAdaptada(),
      'adaptar':           () => actionsRef.current.generarRutinaAdaptada(),
      'más energía':   () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'menos energía': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      'limpiar dolores': () => actionsRef.current.clearPainZones(),
      'sin dolor':       () => actionsRef.current.clearPainZones(),
      ...Object.keys(VOICE_MUSCLE_MAP).reduce((acc, keyword) => {
        const slug = VOICE_MUSCLE_MAP[keyword]
        acc[`me duele el ${keyword}`]  = () => actionsRef.current.addPainZone(slug)
        acc[`me duele la ${keyword}`]  = () => actionsRef.current.addPainZone(slug)
        acc[`me duele ${keyword}`]     = () => actionsRef.current.addPainZone(slug)
        acc[`dolor en ${keyword}`]     = () => actionsRef.current.addPainZone(slug)
        acc[`quitar dolor ${keyword}`] = () => actionsRef.current.removePainZone(slug)
        return acc
      }, {})
    }
    for (let i = 1; i <= 10; i++) {
      commands[`nivel ${i}`]       = () => setFeelVal(i)
      commands[`poner nivel ${i}`] = () => setFeelVal(i)
    }
    commandsRef.current = commands
    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening])

  // ── Render ───────────────────────────────────────────────────────────────────
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

        {/* Encabezado dinámico */}
        <div>
          <div className="label" style={{ marginBottom: '4px' }}>{diaHoy} — Plan de hoy</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700 }}>
            {dayLabel}
          </div>
        </div>

        {/* Slider de energía */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>¿Cómo te sientes hoy?</div>
          <input type="range" className="range-custom" min="1" max="10" value={feelVal}
            onChange={e => setFeelVal(Number(e.target.value))} disabled={loading} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Agotado</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{feelVal}/10</span>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Con energía</span>
          </div>
        </div>

        {/* Mapa de molestias */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Toca si tienes alguna molestia</div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <HombreFrontal activeIds={mapIdsToSlugs([...painZones])} onMuscleClick={loading ? null : togglePain} width={180} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>
                La IA ajustará tu rutina según las zonas marcadas
              </p>
              {hasPain && (
                <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#fda4af' }}>
                  <strong>⚠ Zonas de molestia marcadas.</strong><br />
                  Di <strong style={{ color: 'var(--accent2)' }}>"generar rutina"</strong> para adaptar con IA.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback de la IA */}
        {aiFeedback && !loading && (
          <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px', borderLeft: '4px solid #4ade80', background: 'rgba(74,222,128,0.03)' }}>
            <div className="label" style={{ fontSize: '10px', color: '#4ade80', marginBottom: '6px' }}>Análisis de Adaptación de GymAI</div>
            <p style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{aiFeedback}</p>
          </div>
        )}

        {/* Error */}
        {errorApi && (
          <div style={{ color: '#f43f5e', fontSize: '12px', textAlign: 'center', background: 'rgba(244,63,94,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>
            ⚠️ {errorApi}
          </div>
        )}

        {/* Lista de ejercicios */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="label">Rutina de Entrenamiento</div>
            <span className="badge badge-cyan" style={{ background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(6,182,212,0.15)' }}>
              {loading ? '...' : `${routine.length} ejercicios`}
            </span>
          </div>
          <div style={{ opacity: loading ? 0.35 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {routine.map((ex, i) => (
              <ExerciseRow key={ex.name + i} num={i + 1} name={ex.name}
                sets={ex.sets_description || ex.sets} modified={ex.is_modified} />
            ))}
            {routine.length === 0 && !loading && (
              <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
                Cargando rutina del día...
              </div>
            )}
          </div>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--accent)', background: '#12161a', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                Recalculando con IA...
              </span>
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button className="btn-primary" style={{ flex: 1.8 }} onClick={aceptarYEntrenar} disabled={loading || routine.length === 0}>
            Aceptar y entrenar
          </button>
          <button className="btn-secondary"
            style={{ flex: 1.2, border: hasPain && !aiFeedback ? '1px solid rgba(74,222,128,0.4)' : '1px solid var(--border2)', color: hasPain && !aiFeedback ? '#4ade80' : 'var(--text)' }}
            onClick={generarRutinaAdaptada} disabled={loading}>
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