import { useState, useEffect, useRef, useCallback } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'
import useMediaPipe from '../hooks/useMediaPipe'
import usePostureAnalysis from '../hooks/usePostureAnalysis'
import HombreFrontal from '../components/svg/HombreFrontal'
import HombreEspalda from '../components/svg/HombreEspalda'

const ROUTINE_DATA = [
  { name: 'Sentadilla', sets_count: 3, sets_description: '3 × 10–12 reps · Peso corporal', exercise: 'sentadilla' },
  { name: 'Elevaciones Laterales', sets_count: 3, sets_description: '3 × 12–15 reps · 8 kg', exercise: 'hombros_laterales' },
  { name: 'Press de Banca con Mancuernas', sets_count: 4, sets_description: '4 × 8–10 reps · 20 kg', exercise: 'press_banca' },
  { name: 'Remo con Mancuerna', sets_count: 3, sets_description: '3 × 10–12 reps · 18 kg', exercise: 'remo' },
]

const MAX_REST_SECONDS = 120 // 2 minutos de descanso objetivo

export default function WorkoutScreen({ go }) {
  const [exIdx, setExIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [gameState, setGameState] = useState('INTRO') // 'INTRO', 'ACTIVE', 'REST'
  const [restSeconds, setRestSeconds] = useState(MAX_REST_SECONDS)

  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  
  // Cámara + esqueleto (sin cambios de comportamiento respecto a tu versión original)
  const { videoRef, canvasRef, startCamera, stopCamera, isActive } = useMediaPipe()

  const currentExercise = ROUTINE_DATA[exIdx]

  // Análisis de postura: el orquestador delega a exercises/index.js según el ejercicio
  const {
    analyzeFrame,
    repCount: detectedReps,
    repsBySide,
    feedback,
    activeMuscles,
    muscleView,
    angle: jointAngle,
    reset: resetPostureAnalysis,
    soportaAnalisis,
  } = usePostureAnalysis({ exercise: currentExercise.exercise })

  const actionsRef = useRef(null)
  const lastSpokenFeedbackIdRef = useRef(null)

  const speak = (text, onComplete = null) => {
    window.speechSynthesis.cancel() 
    stopListening() 

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-PE'
    utterance.rate = 0.98

    utterance.onend = () => {
      if (onComplete) {
        onComplete()
      } else {
        listenForCommands(actionsRef.current.getCommands(), true)
      }
    }
    window.speechSynthesis.speak(utterance)
  }

  // Feedback breve hablado SIN interrumpir el flujo de comandos de voz
  // (a diferencia de speak(), no cancela el reconocimiento activo).
  const speakFeedbackBrief = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-PE'
    utterance.rate = 1.05
    utterance.volume = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const handleSetCompletado = () => {
    if (currentSet < currentExercise.sets_count) {
      setRestSeconds(MAX_REST_SECONDS)
      setGameState('REST')
      speak(`Serie ${currentSet} completada. Iniciando descanso de dos minutos. Descansa.`)
    } else {
      if (exIdx + 1 < ROUTINE_DATA.length) {
        setExIdx(prev => prev + 1)
        setCurrentSet(1)
        setGameState('INTRO')
      } else {
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

  actionsRef.current = { getCommands, handleSetCompletado, comenzarEjercicio }

  // Callback estable que conecta cada frame de MediaPipe con el analizador de postura
  const handleLandmarks = useCallback((landmarks) => {
    analyzeFrame(landmarks)
  }, [analyzeFrame])

  // Orquestador del ciclo de vida de la cámara
  useEffect(() => {
    if (gameState === 'ACTIVE') {
      // Si el ejercicio actual soporta análisis de postura, conectamos el callback;
      // si no (ej. ejercicios de tren superior aún no soportados), la cámara
      // funciona igual que antes, solo mostrando el esqueleto.
      startCamera(soportaAnalisis ? handleLandmarks : undefined)
    } else {
      stopCamera()
      resetPostureAnalysis()
    }
    
    return () => stopCamera()
  }, [gameState, startCamera, stopCamera, soportaAnalisis, handleLandmarks, resetPostureAnalysis])

  // Reproduce en voz el feedback de corrección postural, sin pisar el flujo de voz principal
  useEffect(() => {
    if (!feedback || feedback.id === lastSpokenFeedbackIdRef.current) return
    lastSpokenFeedbackIdRef.current = feedback.id
    if (feedback.type === 'error') {
      speakFeedbackBrief(feedback.message)
    }
  }, [feedback])

  useEffect(() => {
    if (gameState === 'INTRO') {
      speak(
        `Ejercicio ${exIdx + 1}: ${currentExercise.name}. Te tocan ${currentExercise.sets_count} series. Di "empezar" cuando estés listo.`
      )
    }
  }, [exIdx, gameState])

  useEffect(() => {
    if (gameState !== 'REST') return

    const timerId = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerId)
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

  useEffect(() => {
    if (gameState !== 'REST') return

    if (restSeconds === 10) {
      speak('Prepárate para la siguiente serie en diez segundos.')
    } else if (restSeconds <= 5 && restSeconds > 0) {
      speak(String(restSeconds))
    }
  }, [restSeconds, gameState])

  const m = Math.floor(restSeconds / 60)
  const s = restSeconds % 60
  const timerLabel = `${m}:${s < 10 ? '0' : ''}${s}`

  const tieneVisionPostural = soportaAnalisis

  return (
    <div style={{ flex: 1, background: '#0d1117', minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '24px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        
        <div className="glass" style={{ width: '100%', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="label" style={{ fontSize: '11px', marginBottom: '6px' }}>Ejercicio {exIdx + 1} de {ROUTINE_DATA.length}</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
            {currentExercise.name}
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: '14px', margin: 0 }}>
            {currentExercise.sets_description}
          </p>
        </div>

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

              {/* Contenedor principal: video + esqueleto, y si aplica, mapa muscular al costado */}
              <div style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  alignItems: 'stretch',
                }}>

                {/* Feed de Video */}
                <div style={{
                    position: 'relative',
                    flex: tieneVisionPostural ? '2' : '1',
                    aspectRatio: '3/4',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                  }}>
                  
                  <video 
                    ref={videoRef} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                    playsInline 
                    muted 
                  />
                  
                  <canvas 
                    ref={canvasRef} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10 }} 
                  />
                  
                  {!isActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                      Activando visión computacional...
                    </div>
                  )}

                  {/* Contador de reps detectadas automáticamente, superpuesto.
                      Si el ejercicio es unilateral (ej. remo a una mano), se
                      muestra el desglose por brazo y cuál está activo ahora. */}
                  {tieneVisionPostural && isActive && (
                    <div style={{
                        position: 'absolute', top: 10, right: 10, zIndex: 20,
                        background: 'rgba(0,0,0,0.6)', borderRadius: '10px',
                        padding: '6px 10px', textAlign: 'center', minWidth: '64px'
                      }}>
                      {repsBySide ? (
                        <>
                          <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 700, marginBottom: '2px' }}>
                            {repsBySide.activeSideLabel || '—'}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: repsBySide.activeSide === 'left' ? '#22d3ee' : '#9ca3af', lineHeight: 1 }}>
                                {repsBySide.left}
                              </div>
                              <div style={{ fontSize: '8px', color: 'var(--text3)' }}>IZQ</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: repsBySide.activeSide === 'right' ? '#22d3ee' : '#9ca3af', lineHeight: 1 }}>
                                {repsBySide.right}
                              </div>
                              <div style={{ fontSize: '8px', color: 'var(--text3)' }}>DER</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#22d3ee', lineHeight: 1 }}>
                            {detectedReps}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase' }}>
                            reps IA
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Ángulo articular en vivo (referencia técnica/debug, útil para demo) */}
                  {tieneVisionPostural && isActive && jointAngle !== null && (
                    <div style={{
                        position: 'absolute', bottom: 10, left: 10, zIndex: 20,
                        background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
                        padding: '4px 8px', fontSize: '11px', color: '#fff'
                      }}>
                      Ángulo: {jointAngle}°
                    </div>
                  )}
                </div>

                {/* Mapa muscular: solo se muestra para ejercicios con análisis postural.
                    Alterna automáticamente entre vista frontal/espalda según
                    qué músculos trabaja el ejercicio actual (muscleView del
                    hook), sin necesidad de que el usuario lo toque. */}
                {tieneVisionPostural && (
                  <div style={{
                      flex: '0.85',
                      maxWidth: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      padding: '4px'
                    }}>
                    {muscleView === 'espalda' ? (
                      <HombreEspalda
                        activeIds={activeMuscles}
                        highlightColor="#22d3ee"
                        interactive={false}
                        width="100%"
                        height="100%"
                      />
                    ) : (
                      <HombreFrontal
                        activeIds={activeMuscles}
                        highlightColor="#22d3ee"
                        interactive={false}
                        width="100%"
                        height="100%"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta de feedback de corrección postural */}
              {tieneVisionPostural && feedback && (
                <div style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    textAlign: 'center',
                    fontWeight: 600,
                    background: feedback.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: feedback.type === 'error' ? '#f87171' : '#4ade80',
                    border: `1px solid ${feedback.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                  }}>
                  {feedback.type === 'error' ? '⚠️ ' : '✓ '}{feedback.message}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'center' }}>
                {repsBySide
                  ? 'Termina las repeticiones de un brazo y cambia al otro. La IA detecta el cambio automáticamente. Al terminar ambos lados, di:'
                  : tieneVisionPostural
                    ? 'La IA cuenta tus repeticiones automáticamente. Cuando termines la serie, di:'
                    : 'Realiza tus repeticiones. Al terminar di en voz alta:'}<br />
                <strong style={{ color: '#4ade80', fontSize: '14px' }}>"¡Serie completada!"</strong>
              </p>
              <button className="btn-primary" onClick={handleSetCompletado} style={{ background: '#22c55e', width: '100%' }}>
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

        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '30px', fontSize: '11px', color: 'var(--text3)', border: '1px solid rgba(255,255,255,0.02)' }}>
          {gameState === 'INTRO' && '🗣️ Di: "empezar" o "listo"'}
          {gameState === 'ACTIVE' && '🗣️ Di: "serie completada" o "terminado"'}
          {gameState === 'REST' && '🗣️ Di: "saltar descanso", "más tiempo" o "menos tiempo"'}
        </div>
      </div>
    </div>
  )
}