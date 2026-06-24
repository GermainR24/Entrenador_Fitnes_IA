import { useState, useEffect, useRef, useCallback } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'
import { useAuth } from '../context/AuthContext.jsx'

// ─── Constantes ────────────────────────────────────────────────────────────────

const ABBR_DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const FULL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const DAY_NAME_TO_INDEX = {
  'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2,
  'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5, 'domingo': 6,
}

// Plan vacío que se muestra mientras carga, con los 7 días en blanco.
// Evita crashes si la IA tarda o el fetch falla.
function buildEmptyPlan() {
  return Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    label: '—',
    sub: '',
    group: null,
    exercises: null,
    isRest: false,
    trained: false,     // ← propio del frontend: ¿ya entrenó este día?
    feel_value: null,   // ← feel_value registrado ese día
    trainedExercises: [],
  }))
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function WeeklyScreen({ go }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [days, setDays] = useState(buildEmptyPlan())
  const [aiFeedback, setAiFeedback] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState(null)
  const [goal, setGoal] = useState('hipertrofia')

  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const { authFetch } = useAuth()

  // ── Paso 1: cargar historial de la semana ──────────────────────────────────
  // Devuelve { trainedWeekdays, trainedExercises, feelAverage, sessionsByWeekday }
  const fetchWeeklyHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await authFetch('/history/weekly')
      if (!res.ok) throw new Error('No se pudo cargar el historial semanal.')
      const sessions = await res.json()
      // sessions: [{ date, weekday, feel_value, exercises: [...] }, ...]

      const trainedWeekdays = sessions.map(s => s.weekday)
      const trainedExercises = [...new Set(sessions.flatMap(s => s.exercises))]
      const feelAverage = sessions.length > 0
        ? sessions.reduce((acc, s) => acc + s.feel_value, 0) / sessions.length
        : null

      // Mapa weekday → datos de sesión (para enriquecer los días del plan)
      const sessionsByWeekday = {}
      sessions.forEach(s => { sessionsByWeekday[s.weekday] = s })

      return { trainedWeekdays, trainedExercises, feelAverage, sessionsByWeekday }
    } catch (err) {
      console.warn('Historial semanal no disponible, continuing sin él.', err)
      return { trainedWeekdays: [], trainedExercises: [], feelAverage: null, sessionsByWeekday: {} }
    } finally {
      setLoadingHistory(false)
    }
  }, [authFetch])

  // ── Paso 2: pedir el plan semanal a la IA ─────────────────────────────────
  const fetchWeeklyPlan = useCallback(async (historyData, selectedGoal) => {
    setLoadingPlan(true)
    setError(null)
    try {
      const { trainedWeekdays, trainedExercises, feelAverage, sessionsByWeekday } = historyData

      const res = await authFetch('/routines/weekly-plan', {
        method: 'POST',
        body: JSON.stringify({
          trained_weekdays: trainedWeekdays,
          trained_exercises: trainedExercises,
          feel_average: feelAverage,
          goal: selectedGoal,
        }),
      })
      if (!res.ok) throw new Error('No se pudo generar el plan semanal.')
      const data = await res.json()
      // data: { days: [...], ai_feedback: string }

      // Fusionar plan de la IA con historial real del frontend
      // Si el usuario ya entrenó ese día, marcamos trained=true y añadimos
      // los ejercicios que realmente hizo (del historial) en lugar del plan.
      const mergedDays = data.days.map(planDay => {
        const session = sessionsByWeekday[planDay.weekday]
        return {
          ...planDay,
          trained: Boolean(session),
          feel_value: session?.feel_value ?? null,
          trainedExercises: session?.exercises ?? [],
        }
      })

      setDays(mergedDays)
      setAiFeedback(data.ai_feedback)
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.')
    } finally {
      setLoadingPlan(false)
    }
  }, [authFetch])

  // ── Carga inicial: historial → plan ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      const historyData = await fetchWeeklyHistory()
      if (!cancelled) await fetchWeeklyPlan(historyData, goal)
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Regenerar el plan manualmente ─────────────────────────────────────────
  const regenerarPlan = useCallback(async () => {
    const historyData = await fetchWeeklyHistory()
    await fetchWeeklyPlan(historyData, goal)
  }, [fetchWeeklyHistory, fetchWeeklyPlan, goal])

  // ── Comandos de voz ────────────────────────────────────────────────────────
  useEffect(() => {
    const commands = {
      'volver':   () => go('dashboard'),
      'atrás':    () => go('dashboard'),
      'guardar':  () => go('dashboard'),
      'salir':    () => go('dashboard'),

      'generar plan': () => regenerarPlan(),
      'actualizar':   () => regenerarPlan(),
      'refrescar':    () => regenerarPlan(),

      ...Object.entries(DAY_NAME_TO_INDEX).reduce((acc, [name, idx]) => {
        acc[name] = () => setSelectedIdx(idx)
        return acc
      }, {}),

      'siguiente día': () => setSelectedIdx(prev => (prev + 1) % 7),
      'siguiente':     () => setSelectedIdx(prev => (prev + 1) % 7),
      'día anterior':  () => setSelectedIdx(prev => (prev - 1 + 7) % 7),
      'anterior':      () => setSelectedIdx(prev => (prev - 1 + 7) % 7),

      // Cambiar objetivo
      'objetivo fuerza':       () => setGoal('fuerza'),
      'objetivo hipertrofia': () => setGoal('hipertrofia'),
      'objetivo resistencia': () => setGoal('resistencia'),
    }

    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening, go, regenerarPlan])

  // ── Render ─────────────────────────────────────────────────────────────────
  const selected = days[selectedIdx] ?? days[0]
  const isLoading = loadingPlan || loadingHistory

  return (
    <>
      {/* Barra superior */}
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

        {/* Selector de objetivo + botón regenerar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="label" style={{ fontSize: '11px', flexShrink: 0 }}>Objetivo:</div>
          {['fuerza', 'hipertrofia', 'resistencia', 'general'].map(g => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                border: goal === g ? '1px solid var(--accent)' : '1px solid var(--border2)',
                background: goal === g ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: goal === g ? 'var(--accent)' : 'var(--text3)',
              }}
            >
              {g}
            </button>
          ))}
          <button
            onClick={regenerarPlan}
            disabled={isLoading}
            style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: isLoading ? 'var(--text3)' : 'var(--accent2)' }}
          >
            {isLoading ? 'Cargando...' : '✨ Regenerar'}
          </button>
        </div>

        {/* Feedback de la IA */}
        {aiFeedback && !isLoading && (
          <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '12px 14px', borderLeft: '3px solid #4ade80', background: 'rgba(74,222,128,0.03)' }}>
            <div className="label" style={{ fontSize: '10px', color: '#4ade80', marginBottom: '4px' }}>Plan generado por GymAI</div>
            <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{aiFeedback}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: '#f43f5e', fontSize: '12px', textAlign: 'center', background: 'rgba(244,63,94,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Carrusel de días */}
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
            {days.map((day, i) => (
              <DayCard
                key={i}
                day={day}
                abbr={ABBR_DAYS[i]}
                isSelected={i === selectedIdx}
                isLoading={isLoading}
                onClick={() => setSelectedIdx(i)}
              />
            ))}
          </div>
        </div>

        {/* Tarjeta de detalle del día seleccionado */}
        <DayDetail
          day={selected}
          fullDayName={FULL_DAYS[selectedIdx]}
          isLoading={isLoading}
        />

        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => go('dashboard')}>
          Volver al Dashboard
        </button>

        {isListening && (
          <div style={{ fontSize: '10px', color: 'var(--text3)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '20px', textAlign: 'center' }}>
            🗣️ Di: "lunes", "siguiente", "generar plan" o "volver"
          </div>
        )}
      </div>
    </>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function DayCard({ day, abbr, isSelected, isLoading, onClick }) {
  const bg = isLoading
    ? 'rgba(255,255,255,0.02)'
    : day.trained
      ? 'rgba(34,197,94,0.08)'
      : isSelected
        ? 'rgba(6,182,212,0.08)'
        : 'transparent'

  const borderColor = day.trained
    ? 'rgba(34,197,94,0.35)'
    : isSelected
      ? 'var(--accent)'
      : 'var(--border2)'

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        minWidth: '58px',
        padding: '10px 8px',
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        background: bg,
        textAlign: 'center',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {/* Punto verde si ya entrenó ese día */}
      {day.trained && (
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 6, height: 6, borderRadius: '50%',
          background: '#4ade80',
        }} />
      )}
      <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>
        {abbr}
      </div>
      <div style={{
        fontSize: '11px', fontWeight: 600,
        color: isLoading ? 'var(--text3)' : isSelected ? 'var(--accent)' : day.isRest ? 'var(--text3)' : 'var(--text)',
      }}>
        {isLoading ? '—' : day.label}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
        {isLoading ? '' : day.sub}
      </div>
    </div>
  )
}

function DayDetail({ day, fullDayName, isLoading }) {
  if (isLoading) {
    return (
      <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '20px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent)', background: '#12161a', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)', display: 'inline-block' }}>
          Generando plan con IA...
        </div>
      </div>
    )
  }

  return (
    <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
      {/* Encabezado del día */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div className="label" style={{ marginBottom: '2px' }}>
            {day.isRest ? 'Descanso — Día libre' : `${fullDayName}`}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
            {day.isRest ? 'Recovery activo' : day.group ?? day.label}
          </div>
        </div>
        {/* Badge: entrenado vs planificado vs descanso */}
        {day.trained ? (
          <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ✓ Completado
          </span>
        ) : day.isRest ? (
          <span style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px' }}>
            Descanso
          </span>
        ) : (
          <span className="badge badge-cyan" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
            Planificado
          </span>
        )}
      </div>

      {/* Contenido: si ya entrenó ese día, mostrar lo que realmente hizo */}
      {day.trained ? (
        <div>
          <div className="label" style={{ fontSize: '10px', marginBottom: '6px' }}>Lo que realizaste:</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
            {day.trainedExercises.length > 0
              ? day.trainedExercises.join(' · ')
              : 'Sesión registrada sin detalle de ejercicios.'}
          </div>
          {day.feel_value !== null && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="label" style={{ fontSize: '10px' }}>Energía ese día:</div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: day.feel_value >= 7 ? '#4ade80' : day.feel_value >= 4 ? '#f59e0b' : '#f87171' }}>
                {day.feel_value}/10
              </span>
            </div>
          )}
        </div>
      ) : day.isRest ? (
        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
          Movilidad, foam rolling o descanso completo para reparar fibras musculares.
        </div>
      ) : (
        <div>
          <div className="label" style={{ fontSize: '10px', marginBottom: '6px' }}>Ejercicios planificados:</div>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.8 }}>
            {day.exercises ?? 'Sin ejercicios asignados.'}
          </div>
        </div>
      )}
    </div>
  )
}