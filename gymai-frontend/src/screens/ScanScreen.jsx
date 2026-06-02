import { useEffect } from 'react'
import useMediaPipe from '../hooks/useMediaPipe.js'

export default function ScanScreen({ go }) {
  const { videoRef, canvasRef, startCamera, stopCamera, error } = useMediaPipe()

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  return (
    <div style={{ position: 'relative', flex: 1, background: 'linear-gradient(160deg,#0d1117,#0f1a14)', overflow: 'hidden' }}>
      {/* Rejilla de escaneo */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(74,222,128,0.025) 40px, rgba(74,222,128,0.025) 41px),
          repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(74,222,128,0.025) 40px, rgba(74,222,128,0.025) 41px)
        `,
        pointerEvents: 'none'
      }} />

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
        <div style={{ position: 'relative', width: '80%', maxWidth: '300px', aspectRatio: '4/3', border: '2px solid rgba(74,222,128,0.45)', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
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
          {error && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px', fontSize: '11px' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Texto de estado */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--accent2)' }}>
            Analizando equipamiento... Todo listo.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
            2 elementos detectados en tu entorno
          </p>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '10px', padding: '0 24px', width: '100%' }}>
          <button className="btn-primary" style={{ flex: 2 }} onClick={() => go('workout')}>
            Confirmar y entrenar
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => go('dashboard')}>
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}