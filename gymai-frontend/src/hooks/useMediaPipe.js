import { useState, useRef, useCallback, useEffect } from 'react'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

// NOTA DE CAMBIOS respecto a la versión original:
// - startCamera ahora acepta un parámetro opcional `onLandmarks(landmarks)`
//   que se invoca en cada frame con resultados válidos. Esto permite conectar
//   usePostureAnalysis sin tocar la lógica de cámara/dibujo existente.
// - Todo lo demás (captura, canvas, ciclo de vida) se mantiene igual.

export default function useMediaPipe() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const mpPoseRef = useRef(null)
  
  const animationFrameRef = useRef(null)
  const isActiveRef = useRef(false)
  const lastFrameTimeRef = useRef(0)
  const isMountedRef = useRef(true)
  const isModelReadyRef = useRef(false)   // <<< indica si el modelo ya cargó

  const visibilityHandlerRef = useRef(null)
  const onLandmarksRef = useRef(null)     // <<< NUEVO: callback externo de análisis

  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)

  const stopCamera = useCallback(() => {
    isActiveRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current)
      visibilityHandlerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (mpPoseRef.current) {
      mpPoseRef.current.close()
      mpPoseRef.current = null
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    if (isMountedRef.current) {
      setIsActive(false)
      setError(null)
    }
    isModelReadyRef.current = false
    onLandmarksRef.current = null
  }, [])

  // `onLandmarks` es opcional: si no se pasa, el hook funciona exactamente
  // igual que antes (solo cámara + esqueleto dibujado).
  const startCamera = useCallback(async (onLandmarks) => {
    if (isActiveRef.current) stopCamera()
    setError(null)
    isModelReadyRef.current = false
    onLandmarksRef.current = typeof onLandmarks === 'function' ? onLandmarks : null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = resolve
        })
        await videoRef.current.play()
      }
      
      setIsActive(true)
      isActiveRef.current = true

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      })
      
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      // Una vez que se recibe el primer resultado sin error, marcamos el modelo como listo
      pose.onResults((results) => {
        if (!canvasRef.current || !videoRef.current || !isActiveRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        
        if (results.image && results.image.width) {
          canvas.width = results.image.width
          canvas.height = results.image.height
        }
        
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        if (results.poseLandmarks) {
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,
                         { color: '#22d3ee', lineWidth: 2 })
          drawLandmarks(ctx, results.poseLandmarks,
                        { color: '#ffffff', lineWidth: 1, radius: 2 })
        }
        ctx.restore()

        // Marcar como listo al primer resultado válido
        if (!isModelReadyRef.current && results.poseLandmarks) {
          isModelReadyRef.current = true
          console.log("Modelo MediaPipe listo")
        }

        // <<< NUEVO: reenviar landmarks crudos al analizador externo, si existe
        if (results.poseLandmarks && onLandmarksRef.current) {
          onLandmarksRef.current(results.poseLandmarks)
        }
      })
      
      mpPoseRef.current = pose

      // Bucle de procesamiento: solo enviamos frames si el modelo está listo
      const procesarFrame = async (now) => {
        if (!isActiveRef.current) return

        if (now - lastFrameTimeRef.current >= 33) {
          lastFrameTimeRef.current = now
          
          // Verificar que el video tenga dimensiones reales y el modelo listo
          if (videoRef.current && videoRef.current.readyState >= 2 && 
              videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0 &&
              isModelReadyRef.current) {
            try {
              await pose.send({ image: videoRef.current })
            } catch (poseErr) {
              console.error("Error en procesamiento de frame:", poseErr)
            }
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(procesarFrame)
      }

      lastFrameTimeRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(procesarFrame)

      // (Opcional) Esperar un tiempo máximo de 4 segundos para forzar el modelo listo
      // en caso de que nunca llegue el evento onResults (por ejemplo, fallo de carga)
      setTimeout(() => {
        if (!isModelReadyRef.current && isActiveRef.current) {
          console.warn("Timeout: forzando modelo como listo")
          isModelReadyRef.current = true
        }
      }, 4000)

      const handleVisibilityChange = () => {
        if (document.hidden && isActiveRef.current) {
          // podrías pausar la cámara si lo deseas
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
      visibilityHandlerRef.current = handleVisibilityChange

    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al iniciar la cámara')
        setIsActive(false)
        isActiveRef.current = false
      }
      console.error(err)
    }
  }, [stopCamera])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopCamera()
    }
  }, [stopCamera])

  return { videoRef, canvasRef, startCamera, stopCamera, isActive, error }
}