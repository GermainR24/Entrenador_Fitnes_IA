// screens/DashboardScreen.jsx
import { useState, useEffect, useMemo } from 'react'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'
import { useAuth } from '../context/AuthContext.jsx'

// ─── Mismo mapeo que HistoryScreen ────────────────────────────────────────────
const MUSCLE_BY_KEYWORD = [
  { keywords: ['sentadilla', 'squat', 'pierna', 'prensa'],   muscles: ['quadriceps', 'gluteal']          },
  { keywords: ['elevación lateral', 'elevaciones', 'hombro', 'militar'], muscles: ['deltoids']            },
  { keywords: ['remo', 'dominada', 'espalda'],                muscles: ['upper-back', 'biceps']          },
  { keywords: ['press', 'banca', 'fondos', 'pecho'],          muscles: ['chest', 'triceps', 'deltoids']  },
  { keywords: ['curl', 'bíceps', 'bicep'],                    muscles: ['biceps']                        },
  { keywords: ['tríceps', 'tricep', 'francés', 'polea'],      muscles: ['triceps']                       },
  { keywords: ['peso muerto', 'lumbar'],                      muscles: ['lower-back', 'gluteal']         },
  { keywords: ['plancha', 'abdomen', 'crunch'],               muscles: ['abs']                           },
  { keywords: ['pantorrilla', 'gemelo'],                      muscles: ['calves']                        },
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

// ─── Helpers de estadísticas ──────────────────────────────────────────────────

// Racha: días consecutivos entrenados hasta hoy
function calcularRacha(sessions) {
  if (!sessions?.length) return 0
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let racha = 0
  let cursor = new Date(today)
  for (const s of sorted) {
    const d = new Date(s.date); d.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor - d) / 86400000)
    if (diff === 0 || diff === 1) { racha++; cursor = d } else break
  }
  return racha
}

// Nivel y XP: cada sesión completada vale 100 XP, cada nivel requiere 500 XP
function calcularNivelYXP(totalSesiones) {
  const xpTotal = totalSesiones * 100
  const xpPorNivel = 500
  const nivel = Math.floor(xpTotal / xpPorNivel) + 1
  const xpEnNivelActual = xpTotal % xpPorNivel
  return { nivel, xpActual: xpEnNivelActual, xpNecesario: xpPorNivel }
}

// Cuenta sesiones totales desde el historial de chart
function contarSesiones(historyMap) {
  const fechas = new Set()
  Object.values(historyMap).forEach(entries => {
    entries.forEach(e => {
      fechas.add(new Date(e.date).toISOString().split('T')[0])
    })
  })
  return fechas.size
}

// Obtiene los ejercicios entrenados en una fecha específica
function ejerciciosDeHace(sessions, diasAtras) {
  const target = new Date()
  target.setDate(target.getDate() - diasAtras)
  target.setHours(0, 0, 0, 0)
  const session = sessions.find(s => {
    const d = new Date(s.date); d.setHours(0, 0, 0, 0)
    return d.getTime() === target.getTime()
  })
  return session?.exercises ?? []
}

// Texto descriptivo del feel_value
function feelLabel(val) {
  if (!val) return null
  if (val >= 9) return { text: 'Excelente', color: '#4ade80' }
  if (val >= 7) return { text: 'Óptimo',    color: '#4ade80' }
  if (val >= 5) return { text: 'Regular',   color: '#f59e0b' }
  return               { text: 'Bajo',      color: '#f87171' }
}

// Porcentaje de readiness basado en feel_value (escala 1-10 → 10%-100%)
function feelToPercent(val) {
  if (!val) return 70 // default visual
  return Math.round((val / 10) * 100)
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardScreen({ go }) {
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const { authFetch, logout } = useAuth()

  const [weeklySessions, setWeeklySessions] = useState([])
  const [chartData,      setChartData]      = useState({ exercises: [], history: {} })
  const [loading,        setLoading]        = useState(true)

  // ── Fetch paralelo de ambos endpoints usando authFetch ────────────────────
  useEffect(() => {
    async function fetchAll() {
      try {
        const [weeklyRes, chartRes] = await Promise.all([
          authFetch('/history/weekly'),
          authFetch('/history/chart'),
        ])
        if (weeklyRes.ok) setWeeklySessions(await weeklyRes.json())
        if (chartRes.ok)  setChartData(await chartRes.json())
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // ── Estadísticas derivadas ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const racha         = calcularRacha(weeklySessions)
    const totalSesiones = contarSesiones(chartData.history)
    const { nivel, xpActual, xpNecesario } = calcularNivelYXP(totalSesiones)

    const ultimaSesion = weeklySessions.length > 0
      ? [...weeklySessions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null

    const feel    = ultimaSesion?.feel_value ?? null
    const feelInfo = feelLabel(feel)
    const readiness = feelToPercent(feel)

    const ejerciciosAyer = ejerciciosDeHace(weeklySessions, 1)
    const musculosAyer   = musclesDesdeLista(ejerciciosAyer)

    const ejerciciosHoy = ejerciciosDeHace(weeklySessions, 0)
    const musculosHoy   = musclesDesdeLista(ejerciciosHoy)

    return {
      racha, nivel, xpActual, xpNecesario, totalSesiones,
      feel, feelInfo, readiness,
      musculosAyer, musculosHoy,
      entrenoHoy: ejerciciosHoy.length > 0,
      entrenoAyer: ejerciciosAyer.length > 0,
    }
  }, [weeklySessions, chartData])

  // ── Comandos de voz ───────────────────────────────────────────────────────
  useEffect(() => {
    const commands = {
      'iniciar rutina': () => go('planner'),
      'rutina':         () => go('planner'),
      'comenzar':       () => go('planner'),
      'progreso':       () => go('history'),
      'historial':      () => go('history'),
      'mi semana':      () => go('weekly'),
      'semana':         () => go('weekly'),
    }
    listenForCommands(commands, false)
    return () => stopListening()
  }, [listenForCommands, stopListening, go])

  // ── Render ────────────────────────────────────────────────────────────────
  const xpPct = stats.xpNecesario > 0
    ? Math.round((stats.xpActual / stats.xpNecesario) * 100)
    : 0

  const circumference = 2 * Math.PI * 28  // r=28
  const strokeOffset  = circumference - (stats.readiness / 100) * circumference

  return (
    <>
      {/* Nav */}
      <div className="nav-bar">
        <div>
          <div className="label">Bienvenido de vuelta</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700 }}>
            Dashboard
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Nivel dinámico */}
          <span className="badge badge-green">
            {loading ? 'Nv. —' : `Nv. ${stats.nivel}`}
          </span>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            {isListening && (
              <span style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', border: '1px solid white' }} />
            )}
          </div>
        </div>
      </div>

      <div className="screen-body">
        {isListening && (
          <p style={{ fontSize: '11px', color: '#4ade80', marginTop: '-8px', marginBottom: '8px' }}>
            🎤 Escuchando: "iniciar rutina", "progreso", "mi semana"
          </p>
        )}

        {/* ── Preparación diaria ── */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: '4px' }}>Preparación diaria</div>
            {loading ? (
              <div style={{ fontSize: '14px', color: 'var(--text3)' }}>Cargando...</div>
            ) : stats.feel ? (
              <>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700 }}>
                  {stats.feel}/10{' '}
                  <span style={{ color: stats.feelInfo?.color, fontSize: '14px' }}>
                    ↑ {stats.feelInfo?.text}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                  Acondicionamiento físico actual
                  {stats.racha > 0 && ` · 🔥 ${stats.racha} días seguidos`}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text2)' }}>
                  Sin sesiones aún
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                  Completa tu primer entrenamiento
                </div>
              </>
            )}
          </div>

          {/* Anillo de readiness dinámico */}
          <div style={{ position: 'relative', width: '70px', height: '70px' }}>
            <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="35" cy="35" r="28"
                fill="none"
                stroke={stats.feelInfo?.color ?? '#4ade80'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference.toFixed(1)}
                strokeDashoffset={loading ? circumference * 0.3 : strokeOffset.toFixed(1)}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, color: stats.feelInfo?.color ?? 'var(--accent)' }}>
              {loading ? '—' : `${stats.readiness}%`}
            </div>
          </div>
        </div>

        {/* ── Mapa de fatiga muscular ── */}
        <div>
          <div className="label" style={{ marginBottom: '8px' }}>
            Fatiga residual — {loading ? '...' : stats.entrenoAyer ? 'entrenaste ayer' : 'sin sesión ayer'}
          </div>
          <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HombreFrontal
              activeIds={loading
                ? []
                : mapIdsToSlugs(stats.musculosAyer.length > 0
                    ? stats.musculosAyer
                    : stats.musculosHoy)
              }
              width={140}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.entrenoHoy && (
                <Legend color="rgba(74,222,128,0.5)"  label="Activo hoy"  />
              )}
              {stats.entrenoAyer && (
                <Legend color="rgba(245,158,11,0.5)"  label="Fatiga leve" />
              )}
              {!stats.entrenoHoy && !stats.entrenoAyer && !loading && (
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  Sin actividad reciente
                </span>
              )}
              <Legend color="rgba(255,255,255,0.1)" label="Descansado" />
            </div>
          </div>
        </div>

        {/* ── Barra de XP dinámica ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div className="label">
              XP — {loading ? 'Nivel —' : `Nivel ${stats.nivel}`}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
              {loading ? '...' : `${stats.xpActual} / ${stats.xpNecesario} XP`}
            </span>
          </div>
          <div className="xp-bar-wrap">
            <div
              className="xp-bar-fill"
              style={{
                width: loading ? '0%' : `${xpPct}%`,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
          {!loading && stats.totalSesiones > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              {stats.totalSesiones} sesión{stats.totalSesiones !== 1 ? 'es' : ''} completada{stats.totalSesiones !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* ── Botones de acción ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            onClick={() => go('planner')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0c10" strokeWidth="2.5">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            {stats.entrenoHoy ? 'Continuar entrenando' : 'Iniciar rutina'}
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('history')}>
              Ver mi progreso
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('weekly')}>
              Mi semana
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
      <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{label}</span>
    </div>
  )
}