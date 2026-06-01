import { useState, useRef, useCallback } from 'react'

export default function useMediaPipe() {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [isActive, setIsActive] = useState(false)
  const [pose,     setPose]     = useState(null) // last pose landmark results

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setIsActive(true)

      // TODO: Initialize MediaPipe Pose here and pipe videoRef frames
      // import { Pose } from '@mediapipe/pose'
      // import { Camera } from '@mediapipe/camera_utils'
      // const mpPose = new Pose({ ... })
      // mpPose.onResults(results => setPose(results))
      // new Camera(videoRef.current, { onFrame: async () => await mpPose.send({ image: videoRef.current }), ... }).start()

    } catch (err) {
      console.error('Camera access denied:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
    setPose(null)
  }, [])

  return { videoRef, canvasRef, pose, startCamera, stopCamera, isActive }
}
