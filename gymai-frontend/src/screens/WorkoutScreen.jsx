import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'
import useMediaPipe from '../hooks/useMediaPipe'
import usePostureAnalysis from '../hooks/usePostureAnalysis'
import HombreFrontal from '../components/svg/HombreFrontal'
import HombreEspalda from '../components/svg/HombreEspalda'
import { useWorkout } from '../context/WorkoutContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// ─── Mapeo nombre → analizador de visión computacional ───────────────────────
const EXERCISE_NAME_MAP = [
  { keywords: ['sentadilla', 'squat'],            exercise: 'sentadilla'        },
  { keywords: ['elevación lateral', 'elevaciones'], exercise: 'hombros_laterales' },
  { keywords: ['remo'],                             exercise: 'remo'              },
  { keywords: ['press', 'banca', 'mancuerna'],      exercise: 'press_banca'       },
]

function detectarEjercicio(nombre) {
  if (!nombre) return null
  const lower = nombre.toLowerCase()
  for (const { keywords, exercise } of EXERCISE_NAME_MAP) {
    if (keywords.some(k => lower.includes(k))) return exercise
  }
  return null
}

function parseTargetReps(setsDescription) {
  if (!setsDescription) return 12
  const rangeMatch = setsDescription.match(/(\d+)[–\-](\d+)\s*reps?/i)
  if (rangeMatch) return Math.max(parseInt(rangeMatch[1]), parseInt(rangeMatch[2]))
  const singleMatch = setsDescription.match(/(\d+)\s*reps?/i)
  if (singleMatch) return parseInt(singleMatch[1])
  return 12
}

function parseSetsCount(setsDescription) {
  if (!setsDescription) return 3
  const match = setsDescription.match(/^(\d+)\s*[×x]/i)
  return match ? parseInt(match[1]) : 3
}

// Extrae el peso del sets_description como valor por defecto en el input.
// Ej: "4 × 8–10 reps · 75 kg" → "75" | "Peso corporal" → "0"
function parseWeightFromDescription(setsDescription) {
  if (!setsDescription) return ''
  if (/peso corporal/i.test(setsDescription)) return '0'
  const match = setsDescription.match(/·\s*([\d.,]+)\s*kg/i)
  if (match) return match[1].replace(',', '.')
  return ''
}

function esPesoCorporal(setsDescription) {
  return /peso corporal/i.test(setsDescription || '')
}

// ─── Parser de números hablados en español ────────────────────────────────────
const NUMEROS_ES = {
  'cero': 0, 'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
  'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
  'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
  'dieciséis': 16, 'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18,
  'diecinueve': 19, 'veinte': 20, 'veintiuno': 21, 'veintidós': 22,
  'veintidos': 22, 'veintitrés': 23, 'veintitres': 23, 'veinticuatro': 24,
  'veinticinco': 25, 'veintiséis': 26, 'veintiseis': 26, 'veintisiete': 27,
  'veintiocho': 28, 'veintinueve': 29, 'treinta': 30, 'cuarenta': 40,
  'cincuenta': 50, 'sesenta': 60, 'setenta': 70, 'ochenta': 80,
  'noventa': 90, 'cien': 100, 'ciento': 100, 'ciento veinte': 120,
  'ciento cincuenta': 150, 'doscientos': 200,
}

function parseWeightFromVoice(transcript) {
  if (!transcript) return null
  let text = transcript.toLowerCase()
    .replace(/kilos?/g, '').replace(/\bkg\b/g, '')
    .replace(/punto/g, '.').replace(/coma/g, '.')
    .trim()

  // Número directo: "75", "20.5"
  const directMatch = text.match(/^[\d]+([.,][\d]+)?$/)
  if (directMatch) {
    const val = parseFloat(text.replace(',', '.'))
    return isNaN(val) ? null : val
  }

  // "setenta y cinco"
  const yMatch = text.match(/(\w+)\s+y\s+(\w+)/)
  if (yMatch) {
    const decenas = NUMEROS_ES[yMatch[1]]
    const unidades = NUMEROS_ES[yMatch[2]]
    if (decenas !== undefined && unidades !== undefined) return decenas + unidades
  }

  // Palabra simple: "veinte", "ochenta"
  const simple = NUMEROS_ES[text]
  if (simple !== undefined) return simple

  // Número embebido en texto: "unos 75 kilos"
  const embeddedMatch = text.match(/(\d+([.,]\d+)?)/)
  if (embeddedMatch) {
    const val = parseFloat(embeddedMatch[1].replace(',', '.'))
    return isNaN(val) ? null : val
  }

  return null
}

// ─── Fallback de rutina ───────────────────────────────────────────────────────
const FALLBACK_ROUTINE = [
  { name: 'Sentadilla',                 sets_description: '3 × 10–12 reps · Peso corporal', is_modified: false },
  { name: 'Elevaciones Laterales',      sets_description: '3 × 12–15 reps · 8 kg',          is_modified: false },
  { name: 'Press de Banca Mancuernas', sets_description: '4 × 8–10 reps · 20 kg',          is_modified: false },
  { name: 'Remo con Mancuerna',         sets_description: '3 × 10–12 reps · 18 kg',         is_modified: false },
]

const MAX_REST_SECONDS = 120

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WorkoutScreen({ go }) {
  const { routine: contextRoutine, feelValue, painZones } = useWorkout()
  const { authFetch } = useAuth()
  const rawRoutine = contextRoutine?.length > 0 ? contextRoutine : FALLBACK_ROUTINE

  const ROUTINE_DATA = useMemo(() => rawRoutine.map(ex => ({
    name:             ex.name,
    sets_description: ex.sets_description || ex.sets || '',
    sets_count:       parseSetsCount(ex.sets_description || ex.sets),
    exercise:         detectarEjercicio(ex.name),
    target_reps:      parseTargetReps(ex.sets_description || ex.sets),
    is_modified:      ex.is_modified ?? false,
    default_weight:   parseWeightFromDescription(ex.sets_description || ex.sets),
    is_bodyweight:    esPesoCorporal(ex.sets_description || ex.sets),
  })), [rawRoutine])

  // ── Estado del juego ────────────────────────────────────────────────────────
  const [exIdx, setExIdx]             = useState(0)
  const [currentSet, setCurrentSet]   = useState(1)
  const [gameState, setGameState]     = useState('INTRO')
  const [restSeconds, setRestSeconds] = useState(MAX_REST_SECONDS)

  // ── Estado del input de peso ────────────────────────────────────────────────
  const [weightInput, setWeightInput] = useState('')
  const [weightError, setWeightError] = useState('')
  // Peso confirmado para el ejercicio en curso (persiste entre series)
  const confirmedWeightRef = useRef(0)

  // ── Acumulador de ejercicios completados ────────────────────────────────────
  const completedExercisesRef = useRef([])
  const [savingHistory, setSavingHistory] = useState(false)

  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const { videoRef, canvasRef, startCamera, stopCamera, isActive } = useMediaPipe()

  const currentExercise = ROUTINE_DATA[exIdx]

  const {
    analyzeFrame, repCount: detectedReps, repsBySide, feedback,
    activeMuscles, muscleView, angle: jointAngle,
    reset: resetPostureAnalysis, soportaAnalisis,
  } = usePostureAnalysis({ exercise: currentExercise.exercise })

  const actionsRef          = useRef(null)
  const lastFeedbackIdRef   = useRef(null)
  const targetAnnouncedRef  = useRef(false)

  // ── Síntesis de voz ─────────────────────────────────────────────────────────
  const speak = useCallback((text, onComplete = null) => {
    window.speechSynthesis.cancel()
    stopListening()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-PE'
    utterance.rate = 0.98
    utterance.onend = () => {
      if (onComplete) onComplete()
      else if (actionsRef.current) listenForCommands(actionsRef.current.getCommands(), true)
    }
    window.speechSynthesis.speak(utterance)
  }, [stopListening, listenForCommands])

  const speakBrief = useCallback((text) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'es-PE'; u.rate = 1.05; u.volume = 0.9
    window.speechSynthesis.speak(u)
  }, [])

  // 2. Reemplazo de la función saveWorkoutHistory integrando authFetch
  const saveWorkoutHistory = useCallback(async (exercises) => {
    if (!exercises.length) return
    setSavingHistory(true)
    try {
      await authFetch('/history/save', {
        method: 'POST',
        body: JSON.stringify({
          feel_value: feelValue,
          pain_zones: painZones,
          ai_feedback_log: null,
          exercises,
        }),
      })
    } catch (err) {
      console.error('[history/save] Error:', err)
    } finally {
      setSavingHistory(false)
    }
  }, [feelValue, painZones, authFetch])

  // ── Confirmar peso → ACTIVE ──────────────────────────────────────────────────
  const confirmarPeso = useCallback((pesoStr) => {
    const peso = parseFloat(pesoStr)
    if (pesoStr === '' || isNaN(peso) || peso < 0) {
      setWeightError('Ingresa un peso válido (o 0 para peso corporal)')
      return
    }
    setWeightError('')
    confirmedWeightRef.current = peso
    setGameState('ACTIVE')
    speak(`Serie uno de ${currentExercise.sets_count}. ¡A entrenar!`)
  }, [currentExercise, speak])

  // ── Serie completada ─────────────────────────────────────────────────────────
  const handleSetCompletado = useCallback(() => {
    const reps = detectedReps > 0 ? detectedReps : currentExercise.target_reps

    if (currentSet < currentExercise.sets_count) {
      setRestSeconds(MAX_REST_SECONDS)
      setGameState('REST')
      speak(`Serie ${currentSet} completada. Iniciando descanso de dos minutos. Descansa.`)
    } else {
      // Última serie: registrar ejercicio y avanzar
      const logEntry = {
        exercise_name:  currentExercise.name,
        sets_completed: currentExercise.sets_count,
        reps_completed: reps,
        weight_kg:      confirmedWeightRef.current,
      }
      completedExercisesRef.current = [...completedExercisesRef.current, logEntry]

      if (exIdx + 1 < ROUTINE_DATA.length) {
        setExIdx(prev => prev + 1)
        setCurrentSet(1)
        setWeightInput('')
        setWeightError('')
        confirmedWeightRef.current = 0
        setGameState('INTRO')
      } else {
        // Rutina terminada
        speak('¡Felicitaciones! Has terminado toda tu rutina de hoy. Guardando tu progreso.', async () => {
          await saveWorkoutHistory(completedExercisesRef.current)
          go('dashboard')
        })
      }
    }
  }, [
    currentSet, currentExercise, detectedReps,
    exIdx, ROUTINE_DATA.length,
    saveWorkoutHistory, go, speak,
  ])

  // ── INTRO → WEIGHT_INPUT (o directo a ACTIVE si es peso corporal) ────────────
  const comenzarEjercicio = useCallback(() => {
    if (currentExercise.is_bodyweight) {
      confirmedWeightRef.current = 0
      setWeightInput('0')
      setGameState('ACTIVE')
      speak(`Serie uno de ${currentExercise.sets_count}. ¡A entrenar!`)
    } else {
      setWeightInput(currentExercise.default_weight)
      setGameState('WEIGHT_INPUT')
      speak(
        `Ingresa el peso para ${currentExercise.name}. ` +
        `Di el número en kilos o escríbelo, luego di "confirmar".`
      )
    }
  }, [currentExercise, speak])

  // ── Comandos de voz ──────────────────────────────────────────────────────────
  const getCommands = useCallback(() => {
    const base = {
      'volver': () => go('planner'),
      'atrás':  () => go('planner'),
      'salir':  () => go('dashboard'),
    }

    if (gameState === 'INTRO') return {
      ...base,
      'empezar': comenzarEjercicio,
      'listo':   comenzarEjercicio,
      'iniciar': comenzarEjercicio,
    }

    if (gameState === 'WEIGHT_INPUT') return {
      ...base,
      'confirmar': () => confirmarPeso(weightInput),
      'empezar':   () => confirmarPeso(weightInput),
      'listo':     () => confirmarPeso(weightInput),
      __fallback__: (transcript) => {
        const peso = parseWeightFromVoice(transcript)
        if (peso !== null) {
          setWeightInput(String(peso))
          setWeightError('')
          speakBrief(`${peso} kilos. Di "confirmar" para empezar.`)
        }
      },
    }

    if (gameState === 'ACTIVE') return {
      ...base,
      'serie completada': handleSetCompletado,
      'terminado':        handleSetCompletado,
      'termine':          handleSetCompletado,
      'check':            handleSetCompletado,
      'siguiente':        handleSetCompletado,
    }

    if (gameState === 'REST') return {
      ...base,
      'saltar descanso': () => {
        setGameState('ACTIVE')
        setCurrentSet(prev => prev + 1)
        speak(`Descanso terminado. Serie ${currentSet + 1}. ¡A darle!`)
      },
      'más tiempo':    () => setRestSeconds(prev => Math.min(prev + 30, MAX_REST_SECONDS)),
      'menos tiempo': () => setRestSeconds(prev => Math.max(prev - 30, 10)),
    }

    return base
  }, [gameState, weightInput, confirmarPeso, comenzarEjercicio, handleSetCompletado, currentSet, go, speak, speakBrief])

  actionsRef.current = { getCommands }

  // ── Lifecycle: cámara ────────────────────────────────────────────────────────
  const handleLandmarks = useCallback((lm) => analyzeFrame(lm), [analyzeFrame])

  useEffect(() => {
    if (gameState === 'ACTIVE') {
      startCamera(soportaAnalisis ? handleLandmarks : undefined)
    } else {
      stopCamera()
      resetPostureAnalysis()
      targetAnnouncedRef.current = false
    }
    return () => stopCamera()
  }, [gameState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Feedback postural hablado ────────────────────────────────────────────────
  useEffect(() => {
    if (!feedback || feedback.id === lastFeedbackIdRef.current) return
    lastFeedbackIdRef.current = feedback.id
    if (feedback.type === 'error') speakBrief(feedback.message)
  }, [feedback, speakBrief])

  // ── Aviso al llegar al objetivo de reps ─────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'ACTIVE' || !soportaAnalisis) return
    if (!currentExercise.target_reps || targetAnnouncedRef.current) return
    if (detectedReps < currentExercise.target_reps) return
    targetAnnouncedRef.current = true
    speakBrief(`Llegaste a ${currentExercise.target_reps} repeticiones. Puedes seguir o decir serie completada.`)
  }, [detectedReps, gameState, soportaAnalisis, currentExercise.target_reps, speakBrief])

  // ── Voz de introducción al cambiar de ejercicio ──────────────────────────────
  useEffect(() => {
    if (gameState === 'INTRO') {
      speak(
        `Ejercicio ${exIdx + 1}: ${currentExercise.name}. ` +
        `Te tocan ${currentExercise.sets_count} series. Di "empezar" cuando estés listo.`
      )
    }
  }, [exIdx, gameState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer de descanso ────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'REST') return
    const id = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setTimeout(() => {
            setGameState('ACTIVE');
            setCurrentSet(s => s + 1);
            speak(`¡Tiempo cumplido! Iniciando serie ${currentSet + 1}.`);
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [gameState, currentSet]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameState !== 'REST') return
    if (restSeconds === 10) speak('Prepárate para la siguiente serie en diez segundos.')
    else if (restSeconds <= 5 && restSeconds > 0) speak(String(restSeconds))
  }, [restSeconds, gameState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reconocimiento de voz: actualizar al cambiar estado ─────────────────────
  useEffect(() => {
    const commands = getCommands()
    listenForCommands(commands, true)
  }, [gameState, weightInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers UI ───────────────────────────────────────────────────────────────
  const m = Math.floor(restSeconds / 60)
  const s = restSeconds % 60
  const timerLabel = `${m}:${s < 10 ? '0' : ''}${s}`
  const tieneVision = soportaAnalisis

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, background: '#0d1117', minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Nav */}
      <div className="nav-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="back-btn" onClick={() => go('planner')}>← Salir</button>
        <span className="badge badge-cyan" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
          {gameState === 'REST' ? 'Descanso Activo' : 'Rutina en curso'}
        </span>
        {isListening && (
          <span style={{ backgroundColor: '#22c55e', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🎤 Oyendo
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '24px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>

        {/* Tarjeta nombre del ejercicio */}
        <div className="glass" style={{ width: '100%', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="label" style={{ fontSize: '11px', marginBottom: '6px' }}>
            Ejercicio {exIdx + 1} de {ROUTINE_DATA.length}
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
            {currentExercise.name}
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: '14px', margin: 0 }}>
            {currentExercise.sets_description}
          </p>
        </div>

        {/* Panel central */}
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

          {gameState === 'WEIGHT_INPUT' && (
            <WeightInputPanel
              exerciseName={currentExercise.name}
              weightInput={weightInput}
              weightError={weightError}
              onWeightChange={(val) => { setWeightInput(val); setWeightError('') }}
              onConfirm={() => confirmarPeso(weightInput)}
            />
          )}

          {gameState === 'ACTIVE' && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '54px', fontWeight: 800, fontFamily: "'Syne', sans-serif", color: 'var(--accent)' }}>
                  {currentSet}
                </span>
                <span style={{ fontSize: '18px', color: 'var(--text3)' }}>/ {currentExercise.sets_count} series</span>
              </div>

              {!currentExercise.is_bodyweight && (
                <div style={{ fontSize: '13px', color: 'var(--text3)', background: 'rgba(255,255,255,0.04)', padding: '4px 14px', borderRadius: '20px' }}>
                  🏋️ {confirmedWeightRef.current} kg
                </div>
              )}

              {/* Video + mapa muscular */}
              <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'stretch' }}>
                <div style={{ position: 'relative', flex: tieneVision ? '2' : '1', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  <video ref={videoRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                  <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10 }} />
                  {!isActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                      Activando visión computacional...
                    </div>
                  )}
                  {tieneVision && isActive && (
                    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, background: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '6px 10px', textAlign: 'center', minWidth: '64px' }}>
                      {repsBySide ? (
                        <>
                          <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 700, marginBottom: '2px' }}>{repsBySide.activeSideLabel || '—'}</div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: repsBySide.activeSide === 'left' ? '#22d3ee' : '#9ca3af', lineHeight: 1 }}>{repsBySide.left}</div>
                              <div style={{ fontSize: '8px', color: 'var(--text3)' }}>IZQ</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: repsBySide.activeSide === 'right' ? '#22d3ee' : '#9ca3af', lineHeight: 1 }}>{repsBySide.right}</div>
                              <div style={{ fontSize: '8px', color: 'var(--text3)' }}>DER</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#22d3ee', lineHeight: 1 }}>{detectedReps}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase' }}>reps IA</div>
                        </>
                      )}
                    </div>
                  )}
                  {tieneVision && isActive && jointAngle !== null && (
                    <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 20, background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', color: '#fff' }}>
                      Ángulo: {jointAngle}°
                    </div>
                  )}
                </div>

                {tieneVision && (
                  <div style={{ flex: '0.85', maxWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '4px' }}>
                    {muscleView === 'espalda'
                      ? <HombreEspalda activeIds={activeMuscles} highlightColor="#22d3ee" interactive={false} width="100%" height="100%" />
                      : <HombreFrontal activeIds={activeMuscles} highlightColor="#22d3ee" interactive={false} width="100%" height="100%" />
                    }
                  </div>
                )}
              </div>

              {tieneVision && feedback && (
                <div style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', textAlign: 'center', fontWeight: 600, background: feedback.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: feedback.type === 'error' ? '#f87171' : '#4ade80', border: `1px solid ${feedback.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                  {feedback.type === 'error' ? '⚠️ ' : '✓ '}{feedback.message}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text2)', textAlign: 'center' }}>
                {repsBySide
                  ? 'Termina un brazo y cambia al otro. Al terminar ambos lados, di:'
                  : tieneVision
                    ? 'La IA cuenta tus repeticiones. Cuando termines la serie, di:'
                    : 'Realiza tus repeticiones. Al terminar di:'}
                <br />
                <strong style={{ color: '#4ade80', fontSize: '14px' }}>"¡Serie completada!"</strong>
              </p>
              <button className="btn-primary" onClick={handleSetCompletado} style={{ background: '#22c55e', width: '100%' }}>
                ✓ Terminar Serie
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
                <button className="btn-primary" style={{ flex: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  onClick={() => { setGameState('ACTIVE'); setCurrentSet(p => p + 1); speak('Saltando descanso.') }}>
                  Saltar
                </button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRestSeconds(p => Math.min(p + 30, MAX_REST_SECONDS))}>+30s</button>
              </div>
            </>
          )}
        </div>

        {/* Hint de voz */}
        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '30px', fontSize: '11px', color: 'var(--text3)', border: '1px solid rgba(255,255,255,0.02)' }}>
          {gameState === 'INTRO'        && '🗣️ Di: "empezar" o "listo"'}
          {gameState === 'WEIGHT_INPUT' && '🗣️ Di el peso en kilos, luego "confirmar"'}
          {gameState === 'ACTIVE'       && '🗣️ Di: "serie completada" o "terminado"'}
          {gameState === 'REST'         && '🗣️ Di: "saltar descanso", "más tiempo" o "menos tiempo"'}
        </div>

        {savingHistory && (
          <div style={{ fontSize: '12px', color: 'var(--accent)', textAlign: 'center' }}>
            💾 Guardando tu progreso...
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel de ingreso de peso ─────────────────────────────────────────────────
function WeightInputPanel({ exerciseName, weightInput, weightError, onWeightChange, onConfirm }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <span style={{ fontSize: '32px' }}>⚖️</span>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--text2)', margin: '0 0 4px 0' }}>¿Cuánto peso usarás en</p>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent2)', margin: 0 }}>{exerciseName}?</p>
      </div>

      <div style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="number"
          min="0"
          step="0.5"
          value={weightInput}
          onChange={e => onWeightChange(e.target.value)}
          placeholder="Ej: 75"
          style={{
            flex: 1, padding: '14px 16px', borderRadius: '12px', fontSize: '20px',
            fontWeight: 700, textAlign: 'center', background: 'rgba(255,255,255,0.06)',
            border: weightError ? '1px solid #f43f5e' : '1px solid rgba(255,255,255,0.12)',
            color: '#fff', outline: 'none',
          }}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm() }}
          autoFocus
        />
        <span style={{ fontSize: '16px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>kg</span>
      </div>

      {/* Botones de ajuste rápido (+/- 1.25, 2.5, 5 kg) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[-5, -2.5, -1.25, +1.25, +2.5, +5].map(delta => (
          <button
            key={delta}
            onClick={() => {
              const current = parseFloat(weightInput) || 0
              onWeightChange(String(Math.max(0, current + delta)))
            }}
            style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
              border: '1px solid var(--border2)', background: 'rgba(255,255,255,0.04)',
              color: delta > 0 ? '#4ade80' : '#f87171',
            }}
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>

      {weightError && <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>{weightError}</p>}

      <button className="btn-primary" style={{ width: '100%', marginTop: '4px' }} onClick={onConfirm}>
        ✓ Confirmar y empezar
      </button>

      <p style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'center', margin: 0 }}>
        Di el número en voz alta o usa los botones de ajuste
      </p>
    </div>
  )
}