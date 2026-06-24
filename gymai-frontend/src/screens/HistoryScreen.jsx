// screens/HistoryScreen.jsx
import { useState, useEffect, useMemo } from 'react'
import ProgressChart from '../components/svg/ProgressChart.jsx'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'
import { useAuth } from '../context/AuthContext.jsx'

// ─── Mapeo ejercicio → músculos (mismo criterio que WorkoutScreen) ─────────────
// Se usa para colorear el mapa muscular con los ejercicios reales del historial.
const MUSCLE_BY_KEYWORD = [
  { keywords: ['sentadilla', 'squat', 'pierna', 'prensa'],   muscles: ['quadriceps', 'gluteal'] },
  { keywords: ['elevación lateral', 'elevaciones', 'hombro', 'militar'], muscles: ['deltoids'] },
  { keywords: ['remo', 'dominada', 'espalda'],               muscles: ['upper-back', 'biceps'] },
  { keywords: ['press', 'banca', 'fondos', 'pecho'],         muscles: ['chest', 'triceps', 'deltoids'] },
  { keywords: ['curl', 'bíceps', 'bicep'],                   muscles: ['biceps'] },
  { keywords: ['tríceps', 'tricep', 'francés', 'polea'],     muscles: ['triceps'] },
  { keywords: ['peso muerto', 'lumbar'],                      muscles: ['lower-back', 'gluteal'] },
  { keywords: ['plancha', 'abdomen', 'crunch'],              muscles: ['abs'] },
  { keywords: ['pantorrilla', 'gemelo'],                      muscles: ['calves'] },
]

function musclesDesdeLista(exerciseNames) {
  const slugs = new Set()
  exerciseNames.forEach(name => {
    const lower = name.toLowerCase()
    for (const { keywords, muscles } of MUSCLE_BY_KEYWORD) {
      if (keywords.some(k => lower.includes(k))) {
        muscles.forEach(m => slugs.add(m))
        break
      }
    }
  })
  return [...slugs]
}

// ─── Helpers de cálculo de estadísticas ───────────────────────────────────────

// Cuenta semanas únicas con al menos una sesión en el historial de chart
function calcularSemanas(historyMap) {
  const semanas = new Set()
  Object.values(historyMap).forEach(entries => {
    entries.forEach(entry => {
      const date = new Date(entry.date)
      const day = date.getDay() === 0 ? 7 : date.getDay()
      const monday = new Date(date)
      monday.setDate(date.getDate() - day + 1)
      monday.setHours(0, 0, 0, 0)
      semanas.add(monday.toISOString().split('T')[0])
    })
  })
  return semanas.size
}

// Promedio de progreso entre primer y último registro de cada ejercicio
// Devuelve string "+X%" o "—" si no hay suficientes datos
function calcularProgreso(historyMap) {
  const progresos = []
  Object.values(historyMap).forEach(entries => {
    if (entries.length < 2) return
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
    const primero = sorted[0].weight_kg
    const ultimo  = sorted[sorted.length - 1].weight_kg
    if (primero > 0) progresos.push(((ultimo - primero) / primero) * 100)
  })
  if (progresos.length === 0) return '—'
  const avg = progresos.reduce((a, b) => a + b, 0) / progresos.length
  return `${avg >= 0 ? '+' : ''}${avg.toFixed(0)}%`
}

// Racha: días consecutivos entrenados hasta hoy (usando sesiones de la semana)
// weeklySessions: array de { weekday: 0-6, date: 'YYYY-MM-DD', ... }
function calcularRacha(weeklySessions) {
  if (!weeklySessions || weeklySessions.length === 0) return 0
  const sorted = [...weeklySessions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let racha = 0
  let cursor = new Date(today)

  for (const session of sorted) {
    const sessionDate = new Date(session.date)
    sessionDate.setHours(0, 0, 0, 0)
    const diffDays = Math.round((cursor - sessionDate) / 86400000)

    if (diffDays === 0 || diffDays === 1) {
      racha++
      cursor = sessionDate
    } else {
      break
    }
  }
  return racha
}

// ─── Funciones del gráfico (sin cambios) ──────────────────────────────────────

const generateSvgPoints = (historyArray, minW, maxW, svgWidth = 300, svgHeight = 100) => {
  if (!historyArray || historyArray.length === 0) return ''
  if (historyArray.length === 1) return `0,${svgHeight / 2} ${svgWidth},${svgHeight / 2}`
  const padX = 12, padY = 12
  const drawWidth  = svgWidth  - padX * 2
  const drawHeight = svgHeight - padY * 2
  return historyArray.map((item, index) => {
    const x = padX + (index / (historyArray.length - 1)) * drawWidth
    const y = maxW === minW
      ? svgHeight / 2
      : padY + drawHeight - ((item.weight_kg - minW) / (maxW - minW)) * drawHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const processWeeklyData = (rawHistory, maxWeeks = 12) => {
  if (!rawHistory || rawHistory.length === 0) return []
  const weeklyData = {}
  rawHistory.forEach(item => {
    const date = new Date(item.date)
    const day  = date.getDay() === 0 ? 7 : date.getDay()
    const diff = date.getDate() - day + 1
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    const weekKey = monday.toISOString().split('T')[0]
    if (!weeklyData[weekKey] || item.weight_kg > weeklyData[weekKey].weight_kg) {
      weeklyData[weekKey] = {
        date: weekKey,
        weight_kg: item.weight_kg,
        label: `${monday.getDate()} ${monday.toLocaleString('es-ES', { month: 'short' })}`,
      }
    }
  })
  return Object.values(weeklyData)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-maxWeeks)
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HistoryScreen({ go }) {
  const [exIdx, setExIdx] = useState(0)
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const { authFetch } = useAuth()

  const [chartData,       setChartData]       = useState({ exercises: [], history: {} })
  const [weeklySessions,  setWeeklySessions]  = useState([])
  const [loading,         setLoading]         = useState(true)

  // ── Fetch de ambos endpoints en paralelo usando authFetch ─────────────────
  useEffect(() => {
    async function fetchAll() {
      try {
        const [chartRes, weeklyRes] = await Promise.all([
          authFetch('/history/chart'),
          authFetch('/history/weekly'),
        ])
        if (chartRes.ok)  setChartData(await chartRes.json())
        if (weeklyRes.ok) setWeeklySessions(await weeklyRes.json())
      } catch (err) {
        console.error('Error cargando historial:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // ── Estadísticas calculadas en tiempo real ────────────────────────────────
  const stats = useMemo(() => ({
    semanas:  calcularSemanas(chartData.history),
    progreso: calcularProgreso(chartData.history),
    racha:    calcularRacha(weeklySessions),
  }), [chartData, weeklySessions])

  // ── Músculos trabajados derivados del historial real ──────────────────────
  const activeMuscles = useMemo(
    () => musclesDesdeLista(chartData.exercises),
    [chartData.exercises]
  )

  // ── Navegación entre ejercicios ───────────────────────────────────────────
  const changeExercise = (delta) => {
    if (chartData.exercises.length === 0) return
    setExIdx(prev => (prev + delta + chartData.exercises.length) % chartData.exercises.length)
  }

  useEffect(() => {
    const commands = {
      'volver':             () => go('dashboard'),
      'atrás':              () => go('dashboard'),
      'dashboard':          () => go('dashboard'),
      'siguiente ejercicio': () => changeExercise(1),
      'siguiente':          () => changeExercise(1),
      'anterior ejercicio': () => changeExercise(-1),
      'anterior':           () => changeExercise(-1),
    }
    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening, go, chartData.exercises.length])

  // ── Datos del gráfico para el ejercicio seleccionado ─────────────────────
  const currentExercise = chartData.exercises[exIdx] || 'Sin datos'
  const rawHistory      = chartData.history[currentExercise] || []
  const weeklyHistory   = processWeeklyData(rawHistory, 12)

  const weights  = weeklyHistory.map(i => i.weight_kg)
  const chartMin = weights.length > 0 ? Math.floor(Math.min(...weights) - 5) : 0
  const chartMax = weights.length > 0 ? Math.ceil(Math.max(...weights)  + 5) : 0
  const chartMid = ((chartMax + chartMin) / 2).toFixed(1)
  const svgPoints = generateSvgPoints(weeklyHistory, chartMin, chartMax)

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
        <p>Analizando progreso histórico...</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Historial
        </span>
        {isListening && (
          <span style={{ marginLeft: 'auto', backgroundColor: '#22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🎤</span> Escuchando
          </span>
        )}
      </div>

      <div className="screen-body">
        {isListening && (
          <p style={{ fontSize: '11px', color: '#4ade80', marginTop: '-8px', marginBottom: '8px' }}>
            🗣️ Comandos: "siguiente ejercicio", "anterior", "volver"
          </p>
        )}

        {/* ── Tarjetas de estadísticas reales ── */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatCard
            value={stats.semanas > 0 ? String(stats.semanas) : '—'}
            label="Semanas"
            color="74,222,128"
          />
          <StatCard
            value={stats.progreso}
            label="Progreso"
            color="34,211,238"
          />
          <StatCard
            value={stats.racha > 0 ? `${stats.racha}🔥` : '0'}
            label="Racha"
            color="245,158,11"
          />
        </div>

        {/* ── Gráfico de progreso ── */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div className="label" style={{ marginBottom: '2px' }}>Progreso de carga</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 600 }}>
                {currentExercise}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={() => changeExercise(-1)}>‹</button>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={() => changeExercise(1)}>›</button>
            </div>
          </div>

          {chartData.exercises.length > 0 ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '20px', fontSize: '10px', color: 'var(--text3)', fontWeight: '600', textAlign: 'right', minWidth: '28px' }}>
                <span>{chartMax}</span>
                <span>{chartMid}</span>
                <span>{chartMin}</span>
              </div>

              <div style={{ flex: 1, paddingRight: '8px' }}>
                <ProgressChart points={svgPoints} />
                <div style={{ position: 'relative', height: '16px', marginTop: '8px', width: '100%' }}>
                  {weeklyHistory.map((item, idx) => {
                    const total = weeklyHistory.length
                    let showLabel = true
                    if (total > 5) {
                      const step = Math.ceil(total / 4)
                      showLabel = idx === 0 || idx === total - 1 || idx % step === 0
                    }
                    if (!showLabel) return null
                    const percentX = total > 1 ? (idx / (total - 1)) * 100 : 50
                    let transform = 'translateX(-50%)'
                    if (idx === 0)          transform = 'translateX(0)'
                    if (idx === total - 1)  transform = 'translateX(-100%)'
                    return (
                      <span key={idx} style={{ position: 'absolute', left: `${percentX}%`, transform, fontSize: '10px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px', textAlign: 'center' }}>
              Registra tu primer entrenamiento para ver la gráfica
            </div>
          )}
        </div>

        {/* ── Mapa muscular con músculos reales ── */}
        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: '4px' }}>Volumen muscular acumulado</div>
          {activeMuscles.length > 0 ? (
            <>
              <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '0 0 10px 0' }}>
                Músculos entrenados en tu historial
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <HombreFrontal
                  activeIds={mapIdsToSlugs(activeMuscles)}
                  width={200}
                />
              </div>
            </>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>
              Sin historial aún. Completa tu primer entrenamiento.
            </p>
          )}
        </div>

        <button className="btn-primary" onClick={() => go('dashboard')} style={{ marginTop: '10px' }}>
          Volver al inicio
        </button>
      </div>
    </>
  )
}

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