import { createContext, useContext, useState } from 'react'

const WorkoutContext = createContext(null)

const DEFAULT_ROUTINE = [
  { name: 'Press de banca',             sets: '4 × 8–10 reps · 75 kg'      },
  { name: 'Press inclinado mancuernas', sets: '3 × 10–12 reps · 28 kg'     },
  { name: 'Fondos en paralelas',        sets: '3 × 12 reps · Peso corporal' },
  { name: 'Press francés',              sets: '3 × 12 reps · 20 kg'         },
  { name: 'Extensiones polea alta',     sets: '3 × 15 reps · 15 kg'         },
]

export function WorkoutProvider({ children }) {
  const [routine,      setRoutine]      = useState(DEFAULT_ROUTINE)
  const [exerciseIdx,  setExerciseIdx]  = useState(0)
  const [currentSerie, setCurrentSerie] = useState(1)
  const [hasFatigue,   setHasFatigue]   = useState(false)
  const [sessionActive, setSessionActive] = useState(false)

  const currentExercise = routine[exerciseIdx] ?? null
  const totalExercises  = routine.length

  function nextExercise() {
    if (exerciseIdx < totalExercises - 1) setExerciseIdx(i => i + 1)
  }

  function nextSerie(totalSeries = 4) {
    if (currentSerie < totalSeries) {
      setCurrentSerie(s => s + 1)
    } else {
      nextExercise()
      setCurrentSerie(1)
    }
  }

  function startSession(customRoutine) {
    if (customRoutine) setRoutine(customRoutine)
    setExerciseIdx(0)
    setCurrentSerie(1)
    setSessionActive(true)
  }

  function endSession() {
    setSessionActive(false)
    setExerciseIdx(0)
    setCurrentSerie(1)
  }

  return (
    <WorkoutContext.Provider value={{
      routine, setRoutine,
      exerciseIdx, currentExercise, totalExercises,
      currentSerie, nextSerie,
      hasFatigue, setHasFatigue,
      sessionActive, startSession, endSession,
    }}>
      {children}
    </WorkoutContext.Provider>
  )
}

/** Hook: const { currentExercise, nextSerie, ... } = useWorkout() */
export function useWorkout() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkout must be used inside <WorkoutProvider>')
  return ctx
}
