
import { LANDMARKS as L, visible, calcularAngulo, promedioAngulos } from './poseUtils'

export const SHOULDER_LATERAL_CONFIG = {
  label: 'Hombros laterales',
  muscles: ['deltoids'],
  view: 'frontal',
  ANGULO_ABAJO: 30,           // brazos pegados al cuerpo
  ANGULO_ARRIBA: 75,          // brazos a la altura del hombro (objetivo correcto)
  ANGULO_EXCESO: 110,         // por encima de esto, ya está usando trapecio/impulso
  ASIMETRIA_TOLERANCIA: 20,   // diferencia en grados tolerada entre brazo izq/der
}

export function analyzeShoulderLateral(landmarks, tracker, cfg = SHOULDER_LATERAL_CONFIG) {
  const hombroI = landmarks[L.HOMBRO_IZQ], hombroD = landmarks[L.HOMBRO_DER]
  const codoI = landmarks[L.CODO_IZQ], codoD = landmarks[L.CODO_DER]
  const caderaI = landmarks[L.CADERA_IZQ], caderaD = landmarks[L.CADERA_DER]

  const ladoIzqOk = [caderaI, hombroI, codoI].every(visible)
  const ladoDerOk = [caderaD, hombroD, codoD].every(visible)

  if (!ladoIzqOk && !ladoDerOk) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase }
  }

  // Ángulo de abducción por lado: cadera-hombro-codo
  const anguloIzq = ladoIzqOk ? calcularAngulo(caderaI, hombroI, codoI) : null
  const anguloDer = ladoDerOk ? calcularAngulo(caderaD, hombroD, codoD) : null
  const angulo = promedioAngulos([anguloIzq, anguloDer])
  if (angulo === null) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase }
  }

  const nuevosErrores = []

  // Asimetría entre brazos (un brazo sube más que el otro)
  if (anguloIzq !== null && anguloDer !== null) {
    const diferencia = Math.abs(anguloIzq - anguloDer)
    if (diferencia > cfg.ASIMETRIA_TOLERANCIA && angulo > cfg.ANGULO_ABAJO + 15) {
      nuevosErrores.push({ code: 'asimetria', message: 'Intenta levantar ambos brazos a la misma altura' })
    }
  }

  // Exceso de altura (compensando con trapecio/impulso en vez de deltoides)
  if (angulo > cfg.ANGULO_EXCESO) {
    nuevosErrores.push({ code: 'exceso_altura', message: 'No subas más arriba del hombro, eso ya no trabaja el deltoides' })
  }

  nuevosErrores.forEach((e) => tracker.errors.add(e.code))
  tracker.maxAngle = Math.max(tracker.maxAngle, angulo)

  let repCompleted = false
  let repHadRangeIssue = false

  switch (tracker.phase) {
    case 'idle':
    case 'down':
      tracker.phase = angulo > cfg.ANGULO_ABAJO ? 'raising' : 'down'
      break
    case 'raising':
      if (angulo > cfg.ANGULO_ARRIBA) tracker.phase = 'raised'
      break
    case 'raised':
      if (angulo < cfg.ANGULO_ARRIBA) tracker.phase = 'lowering'
      break
    case 'lowering':
      if (angulo < cfg.ANGULO_ABAJO) {
        tracker.phase = 'down'
        repCompleted = true
        repHadRangeIssue = tracker.maxAngle < cfg.ANGULO_ARRIBA
        if (repHadRangeIssue) tracker.errors.add('rango')
        tracker.maxAngle = 0
      }
      break
    default:
      break
  }

  const errorsThisFrame = [...nuevosErrores]
  if (repCompleted && repHadRangeIssue) {
    errorsThisFrame.push({ code: 'rango', message: 'Sube un poco más el brazo, hasta la altura del hombro' })
  }

  const result = {
    angle: Math.round(angulo),
    errors: errorsThisFrame,
    repCompleted,
    repWasClean: repCompleted && tracker.errors.size === 0,
    phase: tracker.phase,
  }

  if (repCompleted) tracker.errors = new Set()

  return result
}