import { useEffect, useState, useCallback, useRef } from 'react'
import useMediaPipe from '../hooks/useMediaPipe.js'
import useVoiceCommand from '../hooks/useVoiceCommand'

export default function ScanScreen({ go }) {
  const { videoRef, canvasRef, startCamera, stopCamera, error } = useMediaPipe()
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const [manualError, setManualError] = useState(null)
  
  // 🛡️ SOLUCIÓN: Usamos un ref como candado síncrono en lugar de un estado
  const isCameraStartingRef = useRef(false)
  const [isCameraStartingState, setIsCameraStartingState] = useState(false)

  // Función de inicio de cámara 100% estable
  const initCamera = useCallback(async () => {
    if (isCameraStartingRef.current) return
    
    isCameraStartingRef.current = true
    setIsCameraStartingState(true)
    setManualError(null)
    
    try {
      await startCamera()
    } catch (err) {
      setManualError(err.message || 'No se pudo iniciar la cámara')
    } finally {
      isCameraStartingRef.current = false
      setIsCameraStartingState(false)
    }
  }, [startCamera])

  // 1. Efecto exclusivo para el ciclo de vida de la cámara web
  useEffect(() => {
    initCamera()
    return () => {
      stopCamera() // Apaga la cámara limpiamente al salir de la pantalla
    }
  }, [initCamera, stopCamera])

  // 2. Efecto exclusivo para el control de comandos de voz manos libres
  useEffect(() => {
    const commands = {
      'confirmar': () => go('workout'),
      'entrenar': () => go('workout'),
      'empezar': () => go('workout'),
      'volver al dashboard': () => go('dashboard'),
      'dashboard': () => go('dashboard'),
      'volver atrás': () => go('planner'),
      'atrás': () => go('planner'),
      'reintentar cámara': () => initCamera(),
      'reiniciar cámara': () => initCamera(),
    }

    // continuous = true está justificado aquí por si el usuario se aleja para encuadrarse
    listenForCommands(commands, true) 
    return () => stopListening()
  }, [listenForCommands, stopListening, go, initCamera])

  const displayError = error || manualError

  return (
    <div style={{ position: 'relative', flex: 1, background: 'linear-gradient(160deg,#0d1117,#0f1a14)', overflow: 'hidden', minHeight: '100vh' }}>
      
      {/* Indicador de micrófono activo */}
      {isListening && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#22c55e', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10 }}>
          <span>🎤</span> Escuchando
        </div>
      )}

      {/* Rejilla de escaneo estética */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(74,222,128,0.025) 40px, rgba(74,222,128,0.025) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(74,222,128,0.025) 40px, rgba(74,222,128,0.025) 41px)', pointerEvents: 'none' }} />

      {/* Barra superior */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
        <button className="back-btn" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => go('planner')}>
          ← Volver
        </button>
        <span className="badge badge-green" style={{ background: 'rgba(0,0,0,0.6)' }}>IA activa</span>
      </div>

      {/* Contenido centrado */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 2 }}>
        
        {/* Visor de cámara */}
        <div style={{ position: 'relative', width: '80%', maxWidth: '300px', aspectRatio: '4/3', border: `2px solid ${displayError ? 'rgba(244,63,94,0.6)' : 'rgba(74,222,128,0.45)'}`, borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }}
          />
          
          {/* Overlay de error */}
          {displayError && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', color: '#f43f5e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px', fontSize: '11px', gap: '8px' }}>
              <span>⚠️ {displayError}</span>
              <button
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '10px' }}
                onClick={initCamera}
                disabled={isCameraStartingState}
              >
                {isCameraStartingState ? 'Reintentando...' : 'Reintentar cámara'}
              </button>
            </div>
          )}
        </div>

        {/* Texto de estado */}
        {!displayError && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--accent2)' }}>
              Analizando equipamiento... Todo listo.
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              2 elementos detectados en tu entorno
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '10px', padding: '0 24px', width: '100%', maxWidth: '340px' }}>
          <button className="btn-primary" style={{ flex: 2 }} onClick={() => go('workout')} disabled={!!displayError}>
            Confirmar y entrenar
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('dashboard')}>
            Volver
          </button>
        </div>

        {/* Glosario de comandos por voz */}
        {isListening && !displayError && (
          <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text3)', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px' }}>
            🗣️ Comandos: "confirmar", "volver atrás", "reintentar cámara"
          </div>
        )}
      </div>
    </div>
  )
}