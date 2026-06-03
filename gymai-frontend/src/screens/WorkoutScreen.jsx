import { useEffect } from 'react'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import WaveAudio from '../components/shared/WaveAudio.jsx'
import useMediaPipe from '../hooks/useMediaPipe.js'
import useVoiceCommand from '../hooks/useVoiceCommand.js'   // ← Importamos el hook de voz

export default function WorkoutScreen({ go }) {
  const { videoRef, canvasRef, startCamera, stopCamera, error } = useMediaPipe()
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  // Inicia la cámara y el reconocimiento de voz al montar, lo detiene al desmontar
  useEffect(() => {
    startCamera()

    // Definir comandos de voz específicos para la pantalla de entrenamiento
    // Dentro del useEffect en WorkoutScreen.jsx
    const commands = {
      // Coincide con el botón verde "Terminé serie"
      'terminé': () => go('rest'),
      'serie': () => go('rest'),
      'siguiente': () => go('rest'),

      // Coincide con el botón rojo "Finalizar sesión" (Evitamos 'terminar' por seguridad)
      'finalizar': () => go('history'),
      'finalizar sesión': () => go('history'),

      // Coincide con las acciones secundarias
      'pausa': () => console.log('Pausar repetición...'),
      'continuar': () => console.log('Continuar repetición...'),
      
      // Coincide con el botón "Pantalla apagada"
      'apagar': () => go('blind'),
      'pantalla apagada': () => go('blind'),

      // Coincide con el botón superior "← Volver"
      'volver': () => go('scan'),
      'atrás': () => go('scan')
    }

    // Escucha continua (true) para poder dar varios comandos seguidos
    listenForCommands(commands, true)

    return () => {
      stopCamera()
      stopListening()   // Apaga el micrófono al salir
    }
  }, [startCamera, listenForCommands, stopCamera, stopListening, go])

  return (
    <>
      {/* Barra superior */}
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('scan')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700 }}>
          Entrenamiento
        </span>
        <span className="badge badge-green">En vivo</span>
      </div>

      {/* Indicador flotante de micrófono activo */}
      {isListening && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: '#22c55e',
          color: 'white',
          borderRadius: '999px',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <span>🎤</span> Escuchando...
        </div>
      )}

      <div className="screen-body">
        {/* Título del ejercicio */}
        <div>
          <div className="label" style={{ marginBottom: '4px' }}>Músculo activo</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700 }}>
            Press de Banca{' '}
            <span style={{ color: 'var(--text3)', fontSize: '14px' }}>· Serie 2/4</span>
          </div>
        </div>

        {/* Dos columnas: mapa muscular + cámara */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Columna izquierda: Mapa activo */}
          <div
            className="glass"
            style={{
              borderRadius: 'var(--r2)',
              padding: '14px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div className="label" style={{ fontSize: '9px' }}>Mapa activo</div>
            <HombreFrontal activeIds={mapIdsToSlugs(['chest'])} width={120} />
          </div>

          {/* Columna derecha: Cámara + IA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '12px' }}>
              <div className="label" style={{ fontSize: '9px', marginBottom: '6px' }}>
                Cámara + pose
              </div>

              {/* Contenedor de la cámara (relación 4:3 típica de la webcam) */}
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '4/3',
                  background: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Video en espejo */}
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)'
                  }}
                  playsInline
                  muted
                />

                {/* Canvas para el esqueleto (mismas dimensiones) */}
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'scaleX(-1)'
                  }}
                />

                {/* Mensaje de error si la cámara falla o no da permisos */}
                {error && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#f43f5e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '16px',
                      fontSize: '12px'
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}
              </div>
            </div>

            {/* Visualizador de audio IA */}
            <div className="glass" style={{ borderRadius: '10px', padding: '10px' }}>
              <div className="label" style={{ fontSize: '9px', marginBottom: '6px' }}>
                Audio IA
              </div>
              <WaveAudio barCount={8} />
            </div>
          </div>
        </div>

        {/* Tarjeta de corrección postural */}
        <div className="correction-card">
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent3)' }}>
              Corrección postural
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
              Baja más la cadera — mantén la espalda recta
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('blind')}>
            Pantalla apagada
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => go('rest')}>
            Termine serie →
          </button>
        </div>

        {/* Finalizar sesión */}
        <button
          className="btn-secondary"
          style={{
            width: '100%',
            borderColor: 'rgba(244,63,94,0.3)',
            color: '#f43f5e'
          }}
          onClick={() => go('history')}
        >
          Finalizar sesión
        </button>
      </div>
    </>
  )
}