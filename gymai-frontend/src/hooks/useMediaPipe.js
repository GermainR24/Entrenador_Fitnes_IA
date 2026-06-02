import { useState, useRef, useCallback, useEffect } from 'react'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

export default function useMediaPipe() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const mpPoseRef = useRef(null)
  
  const animationFrameRef = useRef(null)
  const isActiveRef = useRef(false)
  const lastFrameTimeRef = useRef(0)
  const isMountedRef = useRef(true)
  
  // Referencia dedicada para limpiar el evento de pestañas ocultas
  const visibilityHandlerRef = useRef(null)

  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)

  const stopCamera = useCallback(() => {
    // 1. Frenamos el bucle de procesamiento de inmediato
    isActiveRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // 2. Limpieza del evento de visibilidad del navegador
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current)
      visibilityHandlerRef.current = null
    }

    // 3. Apagar el hardware real (Garantiza apagar la luz de la webcam)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // 4. Destruir la instancia de MediaPipe para liberar memoria RAM
    if (mpPoseRef.current) {
      mpPoseRef.current.close()
      mpPoseRef.current = null
    }
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    // 5. Modificar estados de React SÓLO si el componente sigue vivo en pantalla
    if (isMountedRef.current) {
      setIsActive(false)
      setError(null)
    }
  }, [])

  const startCamera = useCallback(async () => {
    if (isActiveRef.current) {
      stopCamera()
    }

    setError(null)
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
      })
      
      mpPoseRef.current = pose

      // Bucle de procesamiento limitado a ~30 FPS (Aprox. 33ms por frame)
      const procesarFrame = async (now) => {
        if (!isActiveRef.current) return

        if (now - lastFrameTimeRef.current >= 33) {
          lastFrameTimeRef.current = now
          
          if (videoRef.current && videoRef.current.readyState >= 2) {
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

      // Manejo limpio del estado de visibilidad guardado en la referencia
      const handleVisibilityChange = () => {
        if (document.hidden && isActiveRef.current) {
          // Comportamiento opcional si deseas pausar al minimizar la pestaña
          // stopCamera()
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
      isMountedRef.current = false // Cambia el flag de renderizado
      stopCamera()                 // Ejecuta toda la desconexión de hardware sin trabas
    }
  }, [stopCamera])

  return { videoRef, canvasRef, startCamera, stopCamera, isActive, error }
}