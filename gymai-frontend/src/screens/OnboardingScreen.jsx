import { useEffect } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'

export default function OnboardingScreen({ go }) {
  // 🟢 Corregido: Solo traemos las funciones reales que exporta tu hook
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  useEffect(() => {
    // Definir comandos de voz inteligentes para la selección de perfil
    const commands = {
      'estándar': () => go('dashboard'),
      'estandar': () => go('dashboard'), // Salvavidas sin tilde
      'normal': () => go('dashboard'),
      
      'accesibilidad': () => go('blind'),
      'visual': () => go('blind'),
      'ciego': () => go('blind'), // Añadido por intuición directa
      
      'movilidad': () => go('dashboard'),
      'bajo impacto': () => go('dashboard'),
      
      'iniciar sesión': () => go('login'),
      'login': () => go('login'),
      'ya tengo cuenta': () => go('login'),
    }

    // El micrófono se abrirá y pedirá permisos nativos automáticamente aquí:
    listenForCommands(commands, true)

    // Detener de forma limpia al desmontar para no dejar hilos abiertos
    return () => stopListening()
  }, [listenForCommands, stopListening, go])

  return (
    <>
      {/* Barra superior con indicador de micrófono */}
      <div className="nav-bar" style={{ border: 'none' }}>
        <div>
          <div className="label">GymAI · MVP</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 800 }}>
            ¿Cómo prefieres<br />entrenar?
          </div>
        </div>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l2.5 2.5L16 9" />
          </svg>
          {isListening && (
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: '#22c55e', border: '1px solid white'
            }} />
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="screen-body">
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
          Elige tu perfil de accesibilidad para personalizar toda la experiencia.
          {isListening && <span style={{ color: '#4ade80', marginLeft: '6px' }}>🎤 Escuchando comandos...</span>}
        </p>

        {/* Perfil estándar */}
        <div className="card-option highlighted" onClick={() => go('dashboard')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="icon-box"
              style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700 }}>
                Perfil estándar
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                Visual y voz combinados
              </div>
            </div>
            <span className="badge badge-green">Recomendado</span>
          </div>
        </div>

        {/* Alta accesibilidad visual */}
        <div className="card-option" onClick={() => go('blind')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="icon-box"
              style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700 }}>
                Alta accesibilidad visual
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                Solo audio y voz
              </div>
            </div>
          </div>
        </div>

        {/* Movilidad reducida */}
        <div className="card-option" onClick={() => go('dashboard')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="icon-box"
              style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700 }}>
                Movilidad reducida
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                Ejercicios de bajo impacto
              </div>
            </div>
          </div>
        </div>

        {/* Enlace a login */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button className="btn-ghost" onClick={() => go('login')}>
            Ya tengo cuenta → Iniciar sesión
          </button>
        </div>
      </div>
    </>
  )
}