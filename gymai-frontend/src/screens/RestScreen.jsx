import { useState, useEffect, useRef } from 'react'
import TimerCircle from '../components/svg/TimerCircle.jsx'
import useVoiceCommand from '../hooks/useVoiceCommand'

const MAX_SECONDS = 120

export default function RestScreen({ go }) {
  const [restSeconds, setRestSeconds] = useState(MAX_SECONDS)
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  // Ajustar temporizador manualmente
  const adjustTimer = (delta) => {
    setRestSeconds(prev => Math.max(10, Math.min(prev + delta, MAX_SECONDS)))
  }

  // Saltar el descanso
  const skipRest = () => {
    go('workout')
  }

  // 🛡️ ESCUDO MUTABLE: Mantiene las funciones frescas cada segundo 
  // sin forzar al micrófono a reiniciarse jamás.
  const actionsRef = useRef({ adjustTimer, skipRest, setRestSeconds })
  actionsRef.current = { adjustTimer, skipRest, setRestSeconds }

  // Temporizador automático de la serie
  useEffect(() => {
    const id = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setTimeout(() => actionsRef.current.skipRest(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, []) 

  // Formato mm:ss
  const m = Math.floor(restSeconds / 60)
  const s = restSeconds % 60
  const label = `${m}:${s < 10 ? '0' : ''}${s}`

  // ── Comandos de Voz Blindados ──────────────────────────────────────────────
  useEffect(() => {
    const commands = {
      // Navegación instantánea
      'saltar descanso': () => actionsRef.current.skipRest(),
      'saltar': () => actionsRef.current.skipRest(),
      'siguiente ejercicio': () => actionsRef.current.skipRest(),
      'terminar descanso': () => actionsRef.current.skipRest(),

      // Incrementos de tiempo
      'más tiempo': () => actionsRef.current.adjustTimer(30),
      'añadir tiempo': () => actionsRef.current.adjustTimer(30),
      'subir tiempo': () => actionsRef.current.adjustTimer(30),
      '+30 segundos': () => actionsRef.current.adjustTimer(30),

      // Decrementos de tiempo
      'menos tiempo': () => actionsRef.current.adjustTimer(-30),
      'quitar tiempo': () => actionsRef.current.adjustTimer(-30),
      'bajar tiempo': () => actionsRef.current.adjustTimer(-30),
      '-30 segundos': () => actionsRef.current.adjustTimer(-30),

      // Reinicios del contador
      'reiniciar descanso': () => actionsRef.current.setRestSeconds(MAX_SECONDS),
      'reiniciar': () => actionsRef.current.setRestSeconds(MAX_SECONDS),
      'dos minutos': () => actionsRef.current.setRestSeconds(120),

      'volver': () => go('workout'),
      'atrás': () => go('workout'),
    }

    // Modo continuo (true) ideal para interactuar con el reloj varias veces
    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening, go]) 

  return (
    <>
      {/* Barra superior con indicador de micrófono */}
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('workout')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Descanso activo
        </span>
        {isListening && (
          <span style={{ marginLeft: 'auto', backgroundColor: '#22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🎤</span> Escuchando
          </span>
        )}
      </div>

      <div className="screen-body" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div className="label" style={{ marginBottom: '16px', textAlign: 'center' }}>
            Siguiente ejercicio
          </div>

          {/* Tarjeta del ejercicio */}
          <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '20px', marginBottom: '24px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
              Press Inclinado Mancuernas
            </div>
            <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5">
                <rect x="2" y="11" width="20" height="4" rx="2" />
                <line x1="7"  y1="11" x2="7"  y2="7"  />
                <line x1="17" y1="11" x2="17" y2="7"  />
                <line x1="5"  y1="7"  x2="19" y2="7"  />
              </svg>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>3 × 10–12 reps · 28 kg</div>
          </div>

          {/* Temporizador circular */}
          <div style={{ marginBottom: '24px' }}>
            <TimerCircle
              seconds={restSeconds}
              maxSeconds={MAX_SECONDS}
              label={label}
            />
          </div>

          {/* Controles táctiles */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => adjustTimer(-30)}>−30s</button>
            <button className="btn-primary" style={{ width: 'auto', padding: '14px 28px' }} onClick={skipRest}>
              Saltar descanso
            </button>
            <button className="btn-secondary" onClick={() => adjustTimer(30)}>+30s</button>
          </div>

          {/* Glosario de ayuda */}
          {isListening && (
            <div style={{ marginTop: '20px', fontSize: '10px', color: 'var(--text3)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>
              🗣️ Comandos: "saltar descanso", "más tiempo", "menos tiempo", "reiniciar", "volver"
            </div>
          )}
        </div>
      </div>
    </>
  )
}