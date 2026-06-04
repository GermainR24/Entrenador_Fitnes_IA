import { useState, useEffect, useRef } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'

// Rutina cargada por defecto (Acoplada al contrato de datos de tu backend)
const ROUTINE_DATA = [
  { name: 'Press Inclinado Mancuernas', sets_count: 3, sets_description: '3 × 10–12 reps · 28 kg' }, //
  { name: 'Press de banca en máquina',  sets_count: 4, sets_description: '4 × 8–10 reps · 75 kg' },
  { name: 'Máquina de fondos asistidos', sets_count: 3, sets_description: '3 × 12 reps · Peso corporal' }
]

const MAX_REST_SECONDS = 120 // 2 minutos de descanso objetivo

export default function WorkoutScreen({ go }) {
  const [exIdx, setExIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [gameState, setGameState] = useState('INTRO') // 'INTRO', 'ACTIVE', 'REST'
  const [restSeconds, setRestSeconds] = useState(MAX_REST_SECONDS)

  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const currentExercise = ROUTINE_DATA[exIdx]

  //  Referencia mutable para ejecutar acciones dentro de closures y comandos de voz sin re-renders
  const actionsRef = useRef(null)

  // ──  FUNCIÓN CENTRAL DE VOZ (SPEAK) CON APAGADO DE MICRÓFONO REFORZADO ──
  const speak = (text, onComplete = null) => {
    window.speechSynthesis.cancel() // Limpia cualquier audio pendiente
    stopListening() //  Apaga el micro inmediatamente para que no escuche sus propias palabras

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-PE'
    utterance.rate = 0.98

    utterance.onend = () => {
      if (onComplete) {
        onComplete()
      } else {
        // Si no hay ninguna acción posterior, vuelve a encender el micrófono de forma segura
        listenForCommands(actionsRef.current.getCommands(), true)
      }
    }
    window.speechSynthesis.speak(utterance)
  }

  // Lógica para avanzar de serie o cambiar de ejercicio de forma automática
  const handleSetCompletado = () => {
    if (currentSet < currentExercise.sets_count) {
      // Pasar a descanso entre series
      setRestSeconds(MAX_REST_SECONDS)
      setGameState('REST')
      speak(`Serie ${currentSet} completada. Iniciando descanso de dos minutos. Descansa.`)
    } else {
      // Ya terminó todas las series de este ejercicio, pasamos al siguiente si existe
      if (exIdx + 1 < ROUTINE_DATA.length) {
        setExIdx(prev => prev + 1)
        setCurrentSet(1)
        setGameState('INTRO')
      } else {
        // Terminó todo el entrenamiento
        speak('¡Felicitaciones! Has terminado toda tu rutina de hoy. Volviendo al panel.', () => {
          go('dashboard')
        })
      }
    }
  }

  const comenzarEjercicio = () => {
    setGameState('ACTIVE')
    speak(`Serie uno de ${currentExercise.sets_count}. ¡A entrenar!`)
  }

  // Generador dinámico de comandos según el estado actual de la pantalla
  const getCommands = () => {
    const baseCommands = {
      'volver': () => go('planner'),
      'atrás': () => go('planner'),
      'salir': () => go('dashboard'),
    }

    if (gameState === 'INTRO') {
      return {
        ...baseCommands,
        'empezar': () => comenzarEjercicio(),
        'listo': () => comenzarEjercicio(),
        'iniciar': () => comenzarEjercicio(),
      }
    }

    if (gameState === 'ACTIVE') {
      return {
        ...baseCommands,
        'serie completada': () => handleSetCompletado(),
        'terminado': () => handleSetCompletado(),
        'termine': () => handleSetCompletado(),
        'check': () => handleSetCompletado(),
        'siguiente': () => handleSetCompletado(),
      }
    }

    if (gameState === 'REST') {
      return {
        ...baseCommands,
        'saltar descanso': () => {
          setGameState('ACTIVE')
          setCurrentSet(prev => prev + 1)
          speak(`Descanso terminado antes de tiempo. Serie ${currentSet + 1}. ¡A darle!`)
        },
        'más tiempo': () => setRestSeconds(prev => Math.min(prev + 30, MAX_REST_SECONDS)),
        'menos tiempo': () => setRestSeconds(prev => Math.max(prev - 30, 10)),
      }
    }

    return baseCommands
  }

  // Guardamos las acciones actualizadas en la referencia en cada render
  actionsRef.current = { getCommands, handleSetCompletado, comenzarEjercicio }

  // 1. Orquestador del Entrenador Virtual (Lee el plan al entrar a un nuevo ejercicio)
  useEffect(() => {
    if (gameState === 'INTRO') {
      speak(
        `Ejercicio ${exIdx + 1}: ${currentExercise.name}. Te tocan ${currentExercise.sets_count} series. Di "empezar" cuando estés listo.`
      )
    }
  }, [exIdx, gameState])

  // 2. Cronómetro Automático de Descanso
  useEffect(() => {
    if (gameState !== 'REST') return

    const timerId = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerId)
          // El temporizador llegó a cero automáticamente
          setTimeout(() => {
            setGameState('ACTIVE')
            setCurrentSet(s => s + 1)
            speak(`¡Tiempo cumplido! Iniciando serie ${currentSet + 1}.`)
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerId)
  }, [gameState, currentSet])

  // 3. Sistema de Alertas de Voz en Cuenta Regresiva (Últimos 10 segundos)
  useEffect(() => {
    if (gameState !== 'REST') return

    if (restSeconds === 10) {
      speak('Prepárate para la siguiente serie en diez segundos.')
    } else if (restSeconds <= 5 && restSeconds > 0) {
      // Cuenta regresiva del 5 al 1 hablada de corrido segundo a segundo
      speak(String(restSeconds))
    }
  }, [restSeconds, gameState])

  // Formateador visual mm:ss para el reloj de la UI
  const m = Math.floor(restSeconds / 60)
  const s = restSeconds % 60
  const timerLabel = `${m}:${s < 10 ? '0' : ''}${s}`

  return (
    <div style={{ flex: 1, background: '#0d1117', minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Navbar Superior */}
      <div className="nav-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="back-btn" onClick={() => go('planner')}>← Salir</button>
        <span className="badge badge-cyan" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
          {gameState === 'REST' ? 'Descanso Activo' : 'Rutina en curso'}
        </span>
        {isListening && (
          <span style={{ backgroundColor: '#22c55e', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🎤</span> Oyendo
          </span>
        )}
      </div>

      {/* CUERPO CENTRAL DE LA PANTALLA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '24px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        
        {/* Tarjeta del Ejercicio Actual */}
        <div className="glass" style={{ width: '100%', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="label" style={{ fontSize: '11px', marginBottom: '6px' }}>Ejercicio {exIdx + 1} de {ROUTINE_DATA.length}</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
            {currentExercise.name}
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: '14px', margin: 0 }}>
            {currentExercise.sets_description}
          </p>
        </div>

        {/* ÁREA INTERACTIVA DINÁMICA SEGÚN EL ESTADO DE JUEGO */}
        <div className="glass2" style={{ width: '100%', padding: '32px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '16px' }}>
          
          {gameState === 'INTRO' && (
            <>
              <span style={{ fontSize: '40px' }}>🏋️‍♂️</span>
              <p style={{ fontSize: '15px', textAlign: 'center', color: 'var(--accent2)', fontWeight: 600 }}>
                El entrenador te está leyendo las instrucciones...
              </p>
              <button className="btn-primary" onClick={comenzarEjercicio} style={{ width: 'auto', padding: '12px 24px' }}>
                ▶ Empezar Ejercicio
              </button>
            </>
          )}

          {gameState === 'ACTIVE' && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '54px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'var(--accent)' }}>
                  {currentSet}
                </span>
                <span style={{ fontSize: '18px', color: 'var(--text3)' }}>/ {currentExercise.sets_count} series</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'center' }}>
                Realiza tus repeticiones. Al terminar di en voz alta:<br />
                <strong style={{ color: '#4ade80', fontSize: '14px' }}>"¡Serie completada!"</strong>
              </p>
              <button className="btn-primary" onClick={handleSetCompletado} style={{ background: '#22c55e' }}>
                ✓ Terminar Serie Táctil
              </button>
            </>
          )}

          {gameState === 'REST' && (
            <>
              <div style={{ fontSize: '54px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: '#f59e0b', letterSpacing: '1px' }}>
                {timerLabel}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', margin: 0 }}>
                Recuperando fibras musculares. La IA te avisará cuando falten 10 segundos.
              </p>
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRestSeconds(p => Math.max(p - 30, 10))}>-30s</button>
                <button className="btn-primary" style={{ flex: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => { setGameState('ACTIVE'); setCurrentSet(p => p + 1); speak('Saltando descanso.'); }}>
                  Saltar
                </button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRestSeconds(p => Math.min(p + 30, MAX_REST_SECONDS))}>+30s</button>
              </div>
            </>
          )}
        </div>

        {/* Glosario dinámico de comandos de voz útiles al pie de pantalla */}
        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '30px', fontSize: '11px', color: 'var(--text3)', border: '1px solid rgba(255,255,255,0.02)' }}>
          {gameState === 'INTRO' && '🗣️ Di: "empezar" o "listo"'}
          {gameState === 'ACTIVE' && '🗣️ Di: "serie completada" o "terminado"'}
          {gameState === 'REST' && '🗣️ Di: "saltar descanso", "más tiempo" o "menos tiempo"'}
        </div>
      </div>
    </div>
  )
}