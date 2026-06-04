// screens/DashboardScreen.jsx
import { useEffect } from 'react'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'

export default function DashboardScreen({ go }) {
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  useEffect(() => {
    // Comandos de voz para el dashboard
    const commands = {
      'iniciar rutina': () => go('planner'),
      'rutina': () => go('planner'),
      'comenzar': () => go('planner'),
      'progreso': () => go('history'),
      'historial': () => go('history'),
      'mi semana': () => go('weekly'),
      'semana': () => go('weekly'),
      'perfil': () => console.log('Abrir perfil (implementar)'),
      'nivel': () => console.log('Mostrar detalles del nivel'),
      'fatiga': () => console.log('Mostrar detalles de fatiga'),
    }

    listenForCommands(commands, false) // modo continuo
    return () => stopListening()
  }, [listenForCommands, stopListening, go])

  return (
    <>
      {/* Barra superior con indicador de micrófono */}
      <div className="nav-bar">
        <div>
          <div className="label">Bienvenido de vuelta</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700 }}>
            Dashboard
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-green">Nv. 12</span>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'rgba(74,222,128,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            position: 'relative'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            {isListening && (
              <span style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: '#22c55e', border: '1px solid white'
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="screen-body">
        {/* Indicador de voz opcional en texto */}
        {isListening && (
          <p style={{ fontSize: '11px', color: '#4ade80', marginTop: '-8px', marginBottom: '8px' }}>
            🎤 Escuchando comandos: "iniciar rutina", "progreso", "mi semana"
          </p>
        )}

        {/* Card de preparación diaria */}
        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: '4px' }}>Preparación diaria</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700 }}>
              7.5 horas{' '}
              <span style={{ color: 'var(--accent)', fontSize: '14px' }}>↑ Óptimo</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
              Sueño anoche · Listo para entrenar
            </div>
          </div>

          {/* Anillo de readiness */}
          <div style={{ position: 'relative', width: '70px', height: '70px' }}>
            <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="35" cy="35" r="28"
                fill="none"
                stroke="#4ade80"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="176"
                strokeDashoffset="35"
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700,
              color: 'var(--accent)',
            }}>
              82%
            </div>
          </div>
        </div>

        {/* Mapa de fatiga muscular */}
        <div>
          <div className="label" style={{ marginBottom: '8px' }}>Fatiga residual — hoy</div>
          <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HombreFrontal
              activeIds={mapIdsToSlugs(['chest', 'lshoulder', 'rshoulder', 'lcalf', 'rcalf'])}
              width={140}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Legend color="rgba(74,222,128,0.5)"   label="Activo hoy"    />
              <Legend color="rgba(245,158,11,0.5)"   label="Fatiga leve"   />
              <Legend color="rgba(255,255,255,0.1)"  label="Descansado"    />
            </div>
          </div>
        </div>

        {/* Barra de XP */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div className="label">XP — Nivel 12</div>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>2,340 / 3,000 XP</span>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-fill" style={{ width: '78%' }} />
          </div>
        </div>

        {/* Botones de acción */}
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
            Iniciar rutina
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

// Componente auxiliar de leyenda (igual que antes)
function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
      <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{label}</span>
    </div>
  )
}