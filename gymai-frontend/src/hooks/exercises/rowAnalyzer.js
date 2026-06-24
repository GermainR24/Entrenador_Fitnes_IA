import { LANDMARKS as L, visible, calcularAngulo, promedioPuntos, inclinacionRespectoVertical } from './poseUtils'

export const ROW_CONFIG = {
  label: 'Remo Unilateral con Mancuerna',
  muscles: ['upper-back', 'lower-back', 'biceps'],
  view: 'espalda',
  ANGULO_EXTENDIDO: 155,     
  ANGULO_CONTRAIDO: 85,      
  ANGULO_RANGO_MINIMO: 105,  
  BALANCEO_TOLERANCIA: 12,  
  VENTANA_DETECCION_BRAZO: 6,  
  VARIANZA_MINIMA_ACTIVO: 4,  
}

// Inicializa los campos específicos de remo dentro del tracker genérico
// (se llama una vez; si ya existen, no los pisa)
function ensureRowTrackerFields(tracker) {
  if (!tracker.row) {
    tracker.row = {
      activeSide: null,        // 'left' | 'right' | null (aún sin determinar)
      reps: { left: 0, right: 0 },
      angleHistory: { left: [], right: [] },
      minAngle: { left: 180, right: 180 },
      phase: { left: 'extended', right: 'extended' },
      baseInclination: null,
      errors: { left: new Set(), right: new Set() },
    }
  }
  return tracker.row
}

function actualizarHistorial(historial, angulo, ventana) {
  historial.push(angulo)
  if (historial.length > ventana) historial.shift()
}

function varianza(valores) {
  if (valores.length < 2) return 0
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  return valores.reduce((sum, v) => sum + (v - media) ** 2, 0) / valores.length
}

export function analyzeRow(landmarks, tracker, cfg = ROW_CONFIG) {
  const row = ensureRowTrackerFields(tracker)

  const hombroI = landmarks[L.HOMBRO_IZQ], hombroD = landmarks[L.HOMBRO_DER]
  const codoI = landmarks[L.CODO_IZQ], codoD = landmarks[L.CODO_DER]
  const muñecaI = landmarks[L.MUÑECA_IZQ], muñecaD = landmarks[L.MUÑECA_DER]
  const caderaI = landmarks[L.CADERA_IZQ], caderaD = landmarks[L.CADERA_DER]

  const ladoIzqOk = [hombroI, codoI, muñecaI].every(visible)
  const ladoDerOk = [hombroD, codoD, muñecaD].every(visible)

  const anguloIzq = ladoIzqOk ? calcularAngulo(hombroI, codoI, muñecaI) : null
  const anguloDer = ladoDerOk ? calcularAngulo(hombroD, codoD, muñecaD) : null

  if (anguloIzq === null && anguloDer === null) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase, side: null }
  }

  if (anguloIzq !== null) actualizarHistorial(row.angleHistory.left, anguloIzq, cfg.VENTANA_DETECCION_BRAZO)
  if (anguloDer !== null) actualizarHistorial(row.angleHistory.right, anguloDer, cfg.VENTANA_DETECCION_BRAZO)

  // --- Determinar qué brazo está activo (el que se mueve más) ---
  const varIzq = varianza(row.angleHistory.left)
  const varDer = varianza(row.angleHistory.right)

  let ladoActivo = row.activeSide
  const izqEnMovimiento = varIzq > cfg.VARIANZA_MINIMA_ACTIVO
  const derEnMovimiento = varDer > cfg.VARIANZA_MINIMA_ACTIVO

  if (izqEnMovimiento && !derEnMovimiento) {
    ladoActivo = 'left'
  } else if (derEnMovimiento && !izqEnMovimiento) {
    ladoActivo = 'right'
  } else if (izqEnMovimiento && derEnMovimiento) {
    // Ambos parecen moverse (raro en este ejercicio): nos quedamos con el de mayor varianza
    ladoActivo = varIzq > varDer ? 'left' : 'right'
  }
  // Si ninguno se mueve (pausa entre brazos), mantenemos el último lado activo conocido

  const cambioDeLado = ladoActivo !== null && row.activeSide !== null && ladoActivo !== row.activeSide
  if (cambioDeLado) {
    // Reiniciamos solo el estado de fase/ángulo mínimo del nuevo lado activo,
    // el contador de reps de cada lado se mantiene independiente
    row.phase[ladoActivo] = 'extended'
    row.minAngle[ladoActivo] = 180
    row.errors[ladoActivo] = new Set()
    row.baseInclination = null
  }
  row.activeSide = ladoActivo

  if (ladoActivo === null) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase, side: null }
  }

  const angulo = ladoActivo === 'left' ? anguloIzq : anguloDer
  if (angulo === null) {
    return { angle: null, errors: [], repCompleted: false, phase: tracker.phase, side: ladoActivo }
  }

  const nuevosErrores = []

  // Balanceo del torso (impulso), referenciado contra la inclinación al iniciar la rep
  if ([hombroI, hombroD, caderaI, caderaD].every(visible)) {
    const hombroMedio = promedioPuntos(hombroI, hombroD)
    const caderaMedia = promedioPuntos(caderaI, caderaD)
    const inclinacionActual = inclinacionRespectoVertical(hombroMedio, caderaMedia)

    if (row.phase[ladoActivo] === 'extended' || row.baseInclination === null) {
      row.baseInclination = inclinacionActual
    } else if (inclinacionActual !== null) {
      const cambio = Math.abs(inclinacionActual - row.baseInclination)
      if (cambio > cfg.BALANCEO_TOLERANCIA) {
        nuevosErrores.push({ code: 'balanceo', message: 'Evita balancear el cuerpo, jala solo con la espalda' })
      }
    }
  }

  nuevosErrores.forEach((e) => row.errors[ladoActivo].add(e.code))
  row.minAngle[ladoActivo] = Math.min(row.minAngle[ladoActivo], angulo)

  let repCompleted = false
  let repHadRangeIssue = false

  // Margen de histéresis para confirmar que el ángulo "dejó de bajar" o
  // "dejó de subir" de forma clara (evita que el ruido de detección dispare
  // cambios de fase falsos en cada frame).
  const HISTERESIS = 6

  switch (row.phase[ladoActivo]) {
    case 'extended':
      if (angulo < cfg.ANGULO_EXTENDIDO) row.phase[ladoActivo] = 'pulling'
      break

    case 'pulling':
      // Pasamos a 'contracted' (punto más bajo del jalón) en cuanto el
      // ángulo empieza a subir de nuevo respecto al mínimo alcanzado,
      // sin importar qué tan profundo haya llegado. La calidad del rango
      // se evalúa más abajo, al cerrar la repetición.
      if (angulo > row.minAngle[ladoActivo] + HISTERESIS) {
        row.phase[ladoActivo] = 'contracted'
      }
      break

    case 'contracted':
      // Fase de transición inmediata hacia el regreso a la extensión.
      row.phase[ladoActivo] = 'releasing'
      break

    case 'releasing':
      if (angulo > cfg.ANGULO_EXTENDIDO) {
        row.phase[ladoActivo] = 'extended'
        repCompleted = true
        repHadRangeIssue = row.minAngle[ladoActivo] > cfg.ANGULO_RANGO_MINIMO
        if (repHadRangeIssue) row.errors[ladoActivo].add('rango')
        row.minAngle[ladoActivo] = 180
      }
      break
    default:
      row.phase[ladoActivo] = 'extended'
      break
  }

  const errorsThisFrame = [...nuevosErrores]
  if (repCompleted && repHadRangeIssue) {
    errorsThisFrame.push({ code: 'rango', message: 'Lleva el codo más atrás para contraer bien la espalda' })
  }

  const repWasClean = repCompleted && row.errors[ladoActivo].size === 0

  if (repCompleted) {
    row.reps[ladoActivo] += 1
    row.errors[ladoActivo] = new Set()
  }

  const ladoLabel = ladoActivo === 'left' ? 'Izquierdo' : 'Derecho'

  const result = {
    angle: Math.round(angulo),
    errors: errorsThisFrame,
    repCompleted,
    repWasClean,
    phase: `${ladoLabel.toLowerCase()}_${row.phase[ladoActivo]}`,
    side: ladoActivo,
    sideLabel: ladoLabel,
    repsLeft: row.reps.left,
    repsRight: row.reps.right,
  }

  return result
}