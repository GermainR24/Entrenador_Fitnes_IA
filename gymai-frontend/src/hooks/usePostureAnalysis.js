import { useState, useRef, useCallback, useMemo } from 'react'
import { crearRepTracker, resetRepTracker } from './exercises/poseUtils'
import { getAnalizador, tieneAnalizador } from './exercises/index'

export default function usePostureAnalysis({ exercise } = {}) {
  const [phase, setPhase] = useState('idle')
  const [repCount, setRepCount] = useState(0)
  const [repsBySide, setRepsBySide] = useState(null) // { left, right, activeSide, activeSideLabel } | null
  const [feedback, setFeedback] = useState(null) // { type: 'error'|'success', message, id }
  const [activeMuscles, setActiveMuscles] = useState([])
  const [angle, setAngle] = useState(null)

  const trackerRef = useRef(crearRepTracker())
  const lastFeedbackTimeRef = useRef(0)


  const muscleView = useMemo(() => {
    const analizador = getAnalizador(exercise)
    return analizador?.config?.view || 'frontal'
  }, [exercise])

  const reset = useCallback(() => {
    resetRepTracker(trackerRef.current)
    setPhase('idle')
    setRepCount(0)
    setRepsBySide(null)
    setFeedback(null)
    setActiveMuscles([])
    setAngle(null)
  }, [])

  const emitFeedback = useCallback((type, message, cooldownMs = 2500) => {
    const now = performance.now()
    if (cooldownMs > 0 && now - lastFeedbackTimeRef.current < cooldownMs) return
    lastFeedbackTimeRef.current = now
    setFeedback({ type, message, id: now })
  }, [])

  const analyzeFrame = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 33) return
    if (!tieneAnalizador(exercise)) return

    const { analyze, config } = getAnalizador(exercise)
    const result = analyze(landmarks, trackerRef.current, config)

    if (result.angle === null) return // sin suficiente visibilidad este frame, o esperando detectar lado activo

    setAngle(result.angle)
    setPhase(result.phase)
    setActiveMuscles(config.muscles || [])

    const esUnilateral = result.side !== undefined && result.side !== null

    if (esUnilateral) {
      setRepsBySide({
        left: result.repsLeft,
        right: result.repsRight,
        activeSide: result.side,
        activeSideLabel: result.sideLabel,
      })
      setRepCount(result.repsLeft + result.repsRight)
    }

    if (result.errors.length > 0) {
      // Mostramos el primero; el resto queda registrado igual en el tracker interno
      const prefijo = esUnilateral ? `${result.sideLabel}: ` : ''
      emitFeedback('error', prefijo + result.errors[0].message, result.repCompleted ? 0 : 2500)
    } else if (result.repCompleted && result.repWasClean) {
      emitFeedback('success', '¡Buena repetición!', 0)
    }

    if (result.repCompleted && !esUnilateral) {
      setRepCount((prev) => prev + 1)
    }
  }, [exercise, emitFeedback])

  return {
    analyzeFrame,
    phase,
    repCount,
    repsBySide,
    feedback,
    activeMuscles,
    muscleView,
    angle,
    reset,
    soportaAnalisis: tieneAnalizador(exercise),
  }
}