import { useState, useRef, useCallback } from 'react'

export default function useSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript,  setTranscript]  = useState('')
  const recognitionRef = useRef(null)

  // ── Text-to-Speech ──────────────────────────────────────────────────────
  const speak = useCallback((text, { rate = 1, pitch = 1, lang = 'es-ES' } = {}) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt   = new SpeechSynthesisUtterance(text)
    utt.lang    = lang
    utt.rate    = rate
    utt.pitch   = pitch
    window.speechSynthesis.speak(utt)
  }, [])

  // ── Speech-to-Text ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser.')
      return
    }

    const rec = new SpeechRecognition()
    rec.lang        = 'es-ES'
    rec.interimResults = true
    rec.continuous  = false

    rec.onstart  = () => setIsListening(true)
    rec.onend    = () => setIsListening(false)
    rec.onerror  = () => setIsListening(false)

    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      setTranscript(last[0].transcript)
    }

    recognitionRef.current = rec
    rec.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { speak, startListening, stopListening, transcript, isListening }
}
