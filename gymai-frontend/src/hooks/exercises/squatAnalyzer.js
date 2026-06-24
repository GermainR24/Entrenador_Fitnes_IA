import { LANDMARKS as L, visible, calcularAngulo, promedioPuntos, promedioAngulos, inclinacionRespectoVertical } from './poseUtils'

export const SQUAT_CONFIG = {
  label: 'Sentadilla',
  muscles: ['quadriceps', 'gluteal'],
  view: 'frontal',
  // Ángulo de rodilla: ~170-180° = pierna extendida (de pie)
  //                     ~70-100°  = sentadilla profunda (abajo)
  ANGULO_DE_PIE: 160,
  ANGULO_ABAJO: 110,
  ANGULO_PROFUNDIDAD_MINIMA: 130,
  VALGO_TOLERANCIA: 0.06, // proporción normalizada 0-1
}

export function analyzeSquat(landmarks, tracker, cfg = SQUAT_CONFIG) {
  const hombroI = landmarks[L.HOMBRO_IZQ], hombroD = landmarks[L.HOMBRO_DER]
  const caderaI = landmarks[L.CADERA_IZQ], caderaD = landmarks[L.CADERA_DER]
  const rodillaI = landmarks[L.RODILLA_IZQ], rodillaD = landmarks[L.RODILLA_DER]
  const tobilloI = landmarks[L.TOBILLO_IZQ], tobilloD = landmarks[L.TOBILLO_DER]

  const ladoIzqOk = [caderaI, rodillaI, tobilloI].every(visible)
  const ladoDerOk = [caderaD, rodillaD, tobilloD].every(visible)

  if (!ladoIzqOk && !ladoDerOk) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase }
  }

  const anguloIzq = ladoIzqOk ? calcularAngulo(caderaI, rodillaI, tobilloI) : null
  const anguloDer = ladoDerOk ? calcularAngulo(caderaD, rodillaD, tobilloD) : null
  const angulo = promedioAngulos([anguloIzq, anguloDer])
  if (angulo === null) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase }
  }

  const nuevosErrores = []

  // Valgo de rodilla (rodillas hacia adentro)
  if (ladoIzqOk && ladoDerOk && angulo < cfg.ANGULO_DE_PIE) {
    const anchoTobillos = Math.abs(tobilloI.x - tobilloD.x)
    const anchoRodillas = Math.abs(rodillaI.x - rodillaD.x)
    if (anchoTobillos > 0.01 && anchoRodillas < anchoTobillos - cfg.VALGO_TOLERANCIA) {
      nuevosErrores.push({ code: 'valgo', message: 'Cuidado, no dejes que tus rodillas se vayan hacia adentro' })
    }
  }

  // Espalda muy inclinada
  if ([hombroI, hombroD, caderaI, caderaD].every(visible)) {
    const hombroMedio = promedioPuntos(hombroI, hombroD)
    const caderaMedia = promedioPuntos(caderaI, caderaD)
    const inclinacion = inclinacionRespectoVertical(hombroMedio, caderaMedia)
    if (inclinacion > 45 && angulo < cfg.ANGULO_DE_PIE) {
      nuevosErrores.push({ code: 'espalda', message: 'Mantén el pecho más arriba, no inclines tanto la espalda' })
    }
  }

  nuevosErrores.forEach((e) => tracker.errors.add(e.code))
  tracker.minAngle = Math.min(tracker.minAngle, angulo)

  let repCompleted = false
  let repHadDepthIssue = false

  switch (tracker.phase) {
    case 'idle':
    case 'up':
      tracker.phase = angulo < cfg.ANGULO_DE_PIE ? 'descending' : 'up'
      break
    case 'descending':
      if (angulo < cfg.ANGULO_ABAJO) tracker.phase = 'down'
      break
    case 'down':
      if (angulo > cfg.ANGULO_ABAJO) tracker.phase = 'ascending'
      break
    case 'ascending':
      if (angulo > cfg.ANGULO_DE_PIE) {
        tracker.phase = 'up'
        repCompleted = true
        repHadDepthIssue = tracker.minAngle > cfg.ANGULO_PROFUNDIDAD_MINIMA
        if (repHadDepthIssue) tracker.errors.add('profundidad')
        tracker.minAngle = 180
      }
      break
    default:
      break
  }

  const errorsThisFrame = [...nuevosErrores]
  if (repCompleted && repHadDepthIssue) {
    errorsThisFrame.push({ code: 'profundidad', message: 'Intenta bajar un poco más en la próxima repetición' })
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