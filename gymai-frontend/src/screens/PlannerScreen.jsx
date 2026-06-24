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
  'aductores': 'adductors', 'isquiotibiales': 'hamstring',
  'pantorrilla': 'calves', 'pantorrillas': 'calves',
  'cuádriceps': 'quadriceps', 'cuadriceps': 'quadriceps',
  'rodilla': 'knees', 'tobillo': 'ankles',
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_VOZ = {
  'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2,
  'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5, 'domingo': 6,
}

// Día actual de la semana (0=lun…6=dom)
function getDiaActual() {
  const d = new Date().getDay() // 0=dom…6=sab
  return d === 0 ? 6 : d - 1   // convertir a 0=lun…6=dom
}

export default function PlannerScreen({ go }) {
  const diaActual = getDiaActual()

  const [selectedDay, setSelectedDay] = useState(diaActual)  // día seleccionado
  const [feelVal,     setFeelVal]     = useState(7)
  const [painZones,   setPainZones]   = useState(new Set())
  const [routine,     setRoutine]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [aiFeedback,  setAiFeedback]  = useState(null)
  const [errorApi,    setErrorApi]    = useState(null)
  const [dayLabel,    setDayLabel]    = useState('Cargando...')

  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const commandsRef = useRef(null)
  const { startSession } = useWorkout()
  const { authFetch } = useAuth()

  // ── Carga la rutina base del día seleccionado ────────────────────────────
  const cargarRutinaDia = useCallback(async (weekday) => {
    setLoading(true)
    setAiFeedback(null)
    setErrorApi(null)
    try {
      const res = await authFetch('/routines/adapt', {
        method: 'POST',
        body: JSON.stringify({ feel_value: 8, pain_zones: [], weekday }),
      })
      if (res.ok) {
        const data = await res.json()
        setRoutine(data.exercises)
        if (data.day_label) setDayLabel(data.day_label)
      }
    } catch (err) {
      console.error('Error cargando rutina:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    cargarRutinaDia(diaActual)
    // Saludo de voz solo al montar
    setTimeout(() => {
      speak(
        `Bienvenido a tu check-in del ${DIAS_SEMANA[diaActual]}. ` +
        `Puedes cambiar el día con los botones si quieres saltarte alguno.`
      )
    }, 300)
    return () => window.speechSynthesis.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Al cambiar el día seleccionado, recargar rutina ───────────────────────
  useEffect(() => {
    cargarRutinaDia(selectedDay)
  }, [selectedDay]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Síntesis de voz ────────────────────────────────────────────────────────
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

  // ── Navegación entre días ─────────────────────────────────────────────────
  const irDiaSiguiente  = useCallback(() => setSelectedDay(d => (d + 1) % 7), [])
  const irDiaAnterior   = useCallback(() => setSelectedDay(d => (d + 6) % 7), [])
  const irDiaActual     = useCallback(() => setSelectedDay(diaActual), [diaActual])

  // ── Adaptar con IA ────────────────────────────────────────────────────────
  const generarRutinaAdaptada = useCallback(async () => {
    setLoading(true)
    setErrorApi(null)
    try {
      const res = await authFetch('/routines/adapt', {
        method: 'POST',
        body: JSON.stringify({
          feel_value: feelVal,
          pain_zones: [...painZones],
          weekday: selectedDay,
        }),
      })
      if (!res.ok) throw new Error('No se pudo obtener la rutina adaptada.')
      const data = await res.json()
      setRoutine(data.exercises)
      setAiFeedback(data.ai_feedback)
      if (data.day_label) setDayLabel(data.day_label)

      const ejerciciosHablados = data.exercises.map((ex, i) => {
        const texto = (ex.sets_description || '')
          .replace(/×/g, 'series de').replace(/–/g, 'a').replace(/reps/g, 'repeticiones')
        return `Ejercicio ${i + 1}: ${ex.name}. ${texto}.`
      }).join(' ')

      speak(`${data.ai_feedback ?? 'Rutina adaptada.'} ${ejerciciosHablados} Di "aceptar" para iniciar.`)
    } catch (err) {
      setErrorApi(err.message || 'Error de comunicación con el backend.')
      speak('Hubo un error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }, [feelVal, painZones, selectedDay, speak, authFetch])

  // ── Aceptar y entrenar ────────────────────────────────────────────────────
  const aceptarYEntrenar = useCallback(() => {
    startSession(routine, feelVal, [...painZones])
    go('workout')
  }, [routine, feelVal, painZones, startSession, go])

  const addPainZone    = useCallback((s) => setPainZones(prev => new Set([...prev, s])), [])
  const removePainZone = useCallback((s) => setPainZones(prev => { const n = new Set(prev); n.delete(s); return n }), [])
  const togglePain     = useCallback((s) => setPainZones(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n }), [])
  const clearPainZones = useCallback(() => setPainZones(new Set()), [])

  const hasPain = painZones.size > 0
  const esHoy   = selectedDay === diaActual
  const actionsRef = useRef(null)
  actionsRef.current = {
    generarRutinaAdaptada, aceptarYEntrenar, go,
    addPainZone, removePainZone, clearPainZones,
    irDiaSiguiente, irDiaAnterior, irDiaActual,
  }

  // ── Comandos de voz ───────────────────────────────────────────────────────
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

      // Navegación de días por voz
      'siguiente día':  () => actionsRef.current.irDiaSiguiente(),
      'día siguiente':  () => actionsRef.current.irDiaSiguiente(),
      'siguiente':      () => actionsRef.current.irDiaSiguiente(),
      'día anterior':   () => actionsRef.current.irDiaAnterior(),
      'anterior':       () => actionsRef.current.irDiaAnterior(),
      'hoy':            () => actionsRef.current.irDiaActual(),
      'volver a hoy':   () => actionsRef.current.irDiaActual(),
      'saltar día':     () => actionsRef.current.irDiaSiguiente(),

      // Ir a un día específico por nombre
      ...Object.entries(DIAS_VOZ).reduce((acc, [nombre, idx]) => {
        acc[nombre] = () => setSelectedDay(idx)
        return acc
      }, {}),

      // Energía
      'más energía':   () => setFeelVal(prev => Math.min(prev + 1, 10)),
      'menos energía': () => setFeelVal(prev => Math.max(prev - 1, 1)),
      'limpiar dolores': () => actionsRef.current.clearPainZones(),

      // Dolores por voz
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <span className="badge badge-amber">Check-in diario</span>
        {isListening && (
          <span style={{ marginLeft: 'auto', backgroundColor: '#22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🎤 Escuchando
          </span>
        )}
      </div>

      <div className="screen-body" style={{ paddingBottom: '30px' }}>

        {/* ── Selector de día ── */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>

            {/* Botón anterior */}
            <button
              onClick={irDiaAnterior}
              style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: '18px', cursor: 'pointer', flexShrink: 0 }}
            >‹</button>

            {/* Día actual */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div className="label" style={{ marginBottom: '2px', fontSize: '10px' }}>
                {esHoy ? 'Hoy' : 'Entrenando el'}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700 }}>
                {DIAS_SEMANA[selectedDay]}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '1px' }}>
                {loading ? '...' : dayLabel}
              </div>
            </div>

            {/* Botón siguiente */}
            <button
              onClick={irDiaSiguiente}
              style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontSize: '18px', cursor: 'pointer', flexShrink: 0 }}
            >›</button>
          </div>

          {/* Botón "Volver a hoy" si está en otro día */}
          {!esHoy && (
            <button
              onClick={irDiaActual}
              style={{ width: '100%', marginTop: '10px', padding: '6px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer' }}
            >
              ↩ Volver al día de hoy ({DIAS_SEMANA[diaActual]})
            </button>
          )}
        </div>

        {/* ── Slider de energía ── */}
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

        {/* ── Mapa de molestias ── */}
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
                  <strong>⚠ Zonas marcadas.</strong><br />
                  Di <strong style={{ color: 'var(--accent2)' }}>"generar rutina"</strong> para adaptar.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Feedback IA ── */}
        {aiFeedback && !loading && (
          <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px', borderLeft: '4px solid #4ade80' }}>
            <div className="label" style={{ fontSize: '10px', color: '#4ade80', marginBottom: '6px' }}>GymAI</div>
            <p style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{aiFeedback}</p>
          </div>
        )}

        {/* ── Error ── */}
        {errorApi && (
          <div style={{ color: '#f43f5e', fontSize: '12px', textAlign: 'center', background: 'rgba(244,63,94,0.08)', padding: '10px', borderRadius: '8px' }}>
            ⚠️ {errorApi}
          </div>
        )}

        {/* ── Lista de ejercicios ── */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="label">Rutina de Entrenamiento</div>
            <span className="badge badge-cyan">
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
                Cargando rutina...
              </div>
            )}
          </div>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--accent)', background: '#12161a', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {aiFeedback !== null ? 'Recalculando con IA...' : 'Cargando rutina del día...'}
              </span>
            </div>
          )}
        </div>

        {/* ── Botones ── */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button className="btn-primary" style={{ flex: 1.8 }}
            onClick={aceptarYEntrenar} disabled={loading || routine.length === 0}>
            Aceptar y entrenar
          </button>
          <button className="btn-secondary"
            style={{ flex: 1.2, border: hasPain && !aiFeedback ? '1px solid rgba(74,222,128,0.4)' : '1px solid var(--border2)', color: hasPain && !aiFeedback ? '#4ade80' : 'var(--text)' }}
            onClick={generarRutinaAdaptada} disabled={loading}>
            {loading ? 'Procesando...' : 'Generar con IA ✨'}
          </button>
        </div>

        {/* Hint de voz */}
        {isListening && (
          <div style={{ fontSize: '10px', color: 'var(--text3)', textAlign: 'center', padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            🗣️ "siguiente día", "martes", "saltar día", "aceptar", "generar rutina"
          </div>
        )}
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