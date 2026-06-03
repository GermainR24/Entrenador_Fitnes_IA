// src/hooks/useVoiceCommand.js
import { useState, useCallback, useRef, useEffect } from 'react'

export default function useVoiceCommand() {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const isMountedRef = useRef(true) // 

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignoramos errores si el flujo ya estaba cerrado
      }
      recognitionRef.current = null
    }
    if (isMountedRef.current) {
      setIsListening(false)
    }
  }, [])

  const listenForCommands = useCallback((commandMap, continuous = false) => {
    // Detener de forma limpia cualquier instancia previa encolada
    stopListening()

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-PE'
    recognition.interimResults = false
    recognition.continuous = continuous 

    recognition.onstart = () => {
      if (isMountedRef.current) setIsListening(true)
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      if (isMountedRef.current) setIsListening(false)
    }

    recognition.onerror = (err) => {
      console.error('Speech recognition error', err)
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
      if (isMountedRef.current) setIsListening(false)
    }

    recognition.onresult = (event) => {
      // Captura dinámica: Funciona perfecto tanto para un solo comando como para modo continuo
      const text = event.results[event.results.length - 1][0].transcript.toLowerCase()
      console.log("IA escuchó:", text)

      for (const [keyword, action] of Object.entries(commandMap)) {
        if (text.includes(keyword)) {
          action()
          if (!continuous) break // Freno de mano si es comando único
        }
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [stopListening])

  // Limpieza automatizada al desmontar pantallas
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopListening()
    }
  }, [stopListening])

  return { isListening, listenForCommands, stopListening }
}