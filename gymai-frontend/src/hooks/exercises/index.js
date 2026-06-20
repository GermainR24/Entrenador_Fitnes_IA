/**
 * index.js (exercises)
 * --------------------
 * Registro central: mapea el identificador de ejercicio (el mismo que usas
 * en ROUTINE_DATA / exercise) a su función analizadora y configuración.
 *
 * Para agregar un ejercicio nuevo en el futuro:
 *   1. Crear src/hooks/exercises/miEjercicioAnalyzer.js siguiendo el patrón
 *      de los existentes (recibe landmarks + tracker, devuelve
 *      { angle, errors, repCompleted, repWasClean, phase }).
 *   2. Registrarlo aquí abajo en EXERCISE_REGISTRY.
 *   No hace falta tocar usePostureAnalysis.js para nada más.
 */
import { analyzeSquat, SQUAT_CONFIG } from './squatAnalyzer'
import { analyzeShoulderLateral, SHOULDER_LATERAL_CONFIG } from './shoulderLateralAnalyzer'
import { analyzeBenchPress, BENCH_PRESS_CONFIG } from './benchPressAnalyzer'
import { analyzeRow, ROW_CONFIG } from './rowAnalyzer'

export const EXERCISE_REGISTRY = {
  sentadilla: {
    analyze: analyzeSquat,
    config: SQUAT_CONFIG,
  },
  hombros_laterales: {
    analyze: analyzeShoulderLateral,
    config: SHOULDER_LATERAL_CONFIG,
  },
  press_banca: {
    analyze: analyzeBenchPress,
    config: BENCH_PRESS_CONFIG,
  },
  remo: {
    analyze: analyzeRow,
    config: ROW_CONFIG,
  },
}

// Devuelve true si existe analizador de visión computacional para ese ejercicio
export function tieneAnalizador(exerciseId) {
  return Boolean(exerciseId && EXERCISE_REGISTRY[exerciseId])
}

export function getAnalizador(exerciseId) {
  return EXERCISE_REGISTRY[exerciseId] || null
}