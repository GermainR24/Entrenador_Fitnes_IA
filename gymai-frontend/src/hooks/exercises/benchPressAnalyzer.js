import { LANDMARKS as L, visible, calcularAngulo, promedioAngulos } from './poseUtils'

export const BENCH_PRESS_CONFIG = {
  label: 'Press de banca',
  muscles: ['chest', 'triceps', 'deltoids'],
  view: 'frontal',
  ANGULO_EXTENDIDO: 155,    // brazos extendidos arriba
  ANGULO_ABAJO: 95,         // codos doblados ~90°, posición baja correcta
  ANGULO_RANGO_MINIMO: 115, // si nunca baja de esto, rango incompleto
  ASIMETRIA_TOLERANCIA: 20,
}

export function analyzeBenchPress(landmarks, tracker, cfg = BENCH_PRESS_CONFIG) {
  const hombroI = landmarks[L.HOMBRO_IZQ], hombroD = landmarks[L.HOMBRO_DER]
  const codoI = landmarks[L.CODO_IZQ], codoD = landmarks[L.CODO_DER]
  const muñecaI = landmarks[L.MUÑECA_IZQ], muñecaD = landmarks[L.MUÑECA_DER]

  const ladoIzqOk = [hombroI, codoI, muñecaI].every(visible)
  const ladoDerOk = [hombroD, codoD, muñecaD].every(visible)

  if (!ladoIzqOk && !ladoDerOk) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase }
  }

  const anguloIzq = ladoIzqOk ? calcularAngulo(hombroI, codoI, muñecaI) : null
  const anguloDer = ladoDerOk ? calcularAngulo(hombroD, codoD, muñecaD) : null
  const angulo = promedioAngulos([anguloIzq, anguloDer])
  if (angulo === null) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase }
  }

  const nuevosErrores = []

  if (anguloIzq !== null && anguloDer !== null) {
    const diferencia = Math.abs(anguloIzq - anguloDer)
    if (diferencia > cfg.ASIMETRIA_TOLERANCIA && angulo < cfg.ANGULO_EXTENDIDO - 10) {
      nuevosErrores.push({ code: 'asimetria', message: 'Empuja parejo con ambos brazos' })
    }
  }

  nuevosErrores.forEach((e) => tracker.errors.add(e.code))
  tracker.minAngle = Math.min(tracker.minAngle, angulo)

  let repCompleted = false
  let repHadRangeIssue = false

  switch (tracker.phase) {
    case 'idle':
    case 'extended':
      tracker.phase = angulo < cfg.ANGULO_EXTENDIDO ? 'lowering' : 'extended'
      break
    case 'lowering':
      if (angulo < cfg.ANGULO_ABAJO) tracker.phase = 'lowered'
      break
    case 'lowered':
      if (angulo > cfg.ANGULO_ABAJO) tracker.phase = 'pressing'
      break
    case 'pressing':
      if (angulo > cfg.ANGULO_EXTENDIDO) {
        tracker.phase = 'extended'
        repCompleted = true
        repHadRangeIssue = tracker.minAngle > cfg.ANGULO_RANGO_MINIMO
        if (repHadRangeIssue) tracker.errors.add('rango')
        tracker.minAngle = 180
      }
      break
    default:
      break
  }

  const errorsThisFrame = [...nuevosErrores]
  if (repCompleted && repHadRangeIssue) {
    errorsThisFrame.push({ code: 'rango', message: 'Baja más el peso para activar bien el pecho' })
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