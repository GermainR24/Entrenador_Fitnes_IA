/**
 * poseUtils.js
 * ------------
 * Funciones puras de geometría sobre landmarks de @mediapipe/pose.
 * Sin estado, sin React. Reutilizadas por todos los analizadores de ejercicio.
 *
 * Índices de landmarks (estándar MediaPipe Pose, 33 puntos):
 * 11: hombro izq   12: hombro der
 * 13: codo izq     14: codo der
 * 15: muñeca izq   16: muñeca der
 * 23: cadera izq   24: cadera der
 * 25: rodilla izq  26: rodilla der
 * 27: tobillo izq  28: tobillo der
 */

export const LANDMARKS = {
  HOMBRO_IZQ: 11, HOMBRO_DER: 12,
  CODO_IZQ: 13, CODO_DER: 14,
  MUÑECA_IZQ: 15, MUÑECA_DER: 16,
  CADERA_IZQ: 23, CADERA_DER: 24,
  RODILLA_IZQ: 25, RODILLA_DER: 26,
  TOBILLO_IZQ: 27, TOBILLO_DER: 28,
}

// Umbral mínimo de confianza/visibilidad para confiar en un landmark
export const VISIBILITY_MIN = 0.5

export function visible(landmark) {
  return landmark && (landmark.visibility === undefined || landmark.visibility >= VISIBILITY_MIN)
}

// Ángulo (en grados) formado en el vértice B por los puntos A-B-C
export function calcularAngulo(a, b, c) {
  if (!a || !b || !c) return null
  const radianes =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angulo = Math.abs((radianes * 180.0) / Math.PI)
  if (angulo > 180) angulo = 360 - angulo
  return angulo
}

// Promedio simple de dos landmarks (para trabajar con ambos lados a la vez)
export function promedioPuntos(p1, p2) {
  if (!p1 || !p2) return p1 || p2 || null
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: ((p1.z || 0) + (p2.z || 0)) / 2 }
}

// Promedia un array de ángulos válidos (descarta null/undefined)
export function promedioAngulos(angulos) {
  const validos = angulos.filter((a) => a !== null && a !== undefined)
  if (validos.length === 0) return null
  return validos.reduce((sum, a) => sum + a, 0) / validos.length
}

// Distancia euclidiana 2D entre dos landmarks (en coordenadas normalizadas 0-1)
export function distancia(a, b) {
  if (!a || !b) return null
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

// Inclinación en grados del segmento p1->p2 respecto a la vertical (0 = perfectamente vertical)
export function inclinacionRespectoVertical(p1, p2) {
  if (!p1 || !p2) return null
  const dx = Math.abs(p1.x - p2.x)
  const dy = Math.abs(p1.y - p2.y)
  return (Math.atan2(dx, dy) * 180) / Math.PI
}

/**
 * Crea un "tracker" de fase genérico reutilizable por cualquier analizador.
 * Encapsula: fase actual, ángulo mínimo/máximo dentro de la rep, y conjunto
 * de errores acumulados durante la repetición en curso.
 *
 * No usa React; vive dentro de un useRef en el hook orquestador.
 */
export function crearRepTracker() {
  return {
    phase: 'idle', // idle | up | contracting | contracted | extending
    minAngle: 180,
    maxAngle: 0,
    errors: new Set(),
  }
}

export function resetRepTracker(tracker) {
  tracker.phase = 'idle'
  tracker.minAngle = 180
  tracker.maxAngle = 0
  tracker.errors = new Set()
}