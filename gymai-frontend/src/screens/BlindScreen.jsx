import { useEffect, useRef, useState } from 'react'
import WaveAudio from '../components/shared/WaveAudio.jsx'
import useVoiceCommand from '../hooks/useVoiceCommand'

export default function BlindScreen({ go }) {
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const [indicadorTexto, setIndicadorTexto] = useState('Modo audio activado')
  
  // Guardamos las referencias de los comandos para que no se pierdan entre renders
  const commandsRef = useRef(null)

  // 🛡️ FUNCIÓN SPEAK OPTIMIZADA: Ahora acepta un callback opcional para cuando termine de hablar
  const speak = (text, onComplete = null) => {
    window.speechSynthesis.cancel() // Limpia colas previas

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-PE'
    utterance.rate = 0.95

    if (onComplete) {
      utterance.onend = () => {
        // Ejecuta la acción una vez que el altavoz se quede en completo silencio
        onComplete()
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    // 1. Definimos los comandos de voz
    const commands = {
      'menú principal': () => speak('Yendo al menú principal', () => go('dashboard')),
      'inicio':         () => speak('Yendo al inicio', () => go('dashboard')),
      'dashboard':      () => speak('Yendo al panel principal', () => go('dashboard')),

      'entrenar':       () => speak('Iniciando escaneo para entrenar', () => go('scan')),
      'empezar':        () => speak('Comenzando entrenamiento', () => go('scan')),
      'scan':           () => speak('Abriendo escáner', () => go('scan')),

      'historial':      () => speak('Mostrando historial de entrenamiento', () => go('history')),
      'progreso':       () => speak('Mostrando tu progreso', () => go('history')),

      'plan semanal':   () => speak('Abriendo tu plan de la semana', () => go('weekly')),
      'semana':         () => speak('Cargando vista semanal', () => go('weekly')),

      'modo visual':    () => speak('Cambiando a modo visual', () => go('dashboard')),
      'pantalla normal':() => speak('Volviendo a pantalla normal', () => go('dashboard')),
      'salir':          () => speak('Saliendo del modo accesible', () => go('dashboard')),

      'ayuda': () => {
        stopListening() // Apaga el micro mientras da la ayuda larga
        setIndicadorTexto('Dando instrucciones de ayuda...')
        speak(
          'Comandos disponibles. Puedes decir: menú principal, entrenar, historial, plan semanal, o modo visual.',
          () => {
            setIndicadorTexto('🎤 Escuchando...')
            listenForCommands(commandsRef.current, true) // Reactiva el micro al terminar
          }
        )
      },
      'comandos': () => commands['ayuda']()
    }

    commandsRef.current = commands

    // 2. Orquestación Inicial: Habla la bienvenida y SÓLO cuando termine, enciende el micro
    setIndicadorTexto('Iniciando sistema de audio...')
    speak(
      'Modo accesible activado. Di ayuda para escuchar los comandos disponibles.',
      () => {
        setIndicadorTexto('🎤 Escuchando...')
        listenForCommands(commands, true)
      }
    )

    // Limpieza al desmontar la pantalla
    return () => {
      stopListening()
      window.speechSynthesis.cancel() // Mata cualquier proceso de habla residual
    }
  }, [listenForCommands, stopListening, go])

  const forzarInstruccion = () => {
    stopListening()
    setIndicadorTexto('Reiniciando escucha...')
    speak('Micrófono activo. Dime un comando.', () => {
      setIndicadorTexto('🎤 Escuchando...')
      listenForCommands(commandsRef.current, true)
    })
  }

  return (
    <div 
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '28px', background: '#000', position: 'relative', minHeight: '100vh' }}
      onClick={forzarInstruccion} // Si el usuario invidente se pierde y toca la pantalla, lo reorienta con voz
    >
      {/* Botón de escape manual visual */}
      <div
        style={{ position: 'absolute', top: '16px', right: '16px', cursor: 'pointer', opacity: 0.25 }}
        onClick={(e) => {
          e.stopPropagation()
          speak('Cambiando a modo visual')
          go('dashboard')
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </div>

      {/* Botón central interactivo táctil */}
      <div>
        <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '2px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: isListening ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={isListening ? '#4ade80' : 'rgba(255,255,255,0.3)'} strokeWidth="2">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </div>
        </div>
      </div>

      {/* Estado Actual */}
      <div style={{ textAlign: 'center', maxWidth: '280px' }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
          {indicadorTexto}
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '8px' }}>
          Toca en cualquier lado para repetir las instrucciones
        </p>
      </div>

      {/* Animación de Ondas */}
      {isListening && (
        <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '16px', padding: '16px 32px' }}>
          <WaveAudio barCount={6} style={{ justifyContent: 'center', marginBottom: '6px' }} />
        </div>
      )}
    </div>
  )
}