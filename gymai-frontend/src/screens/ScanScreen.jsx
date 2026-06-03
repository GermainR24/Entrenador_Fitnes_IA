import { useEffect, useState, useCallback, useRef } from 'react'
import useMediaPipe from '../hooks/useMediaPipe.js'
import useVoiceCommand from '../hooks/useVoiceCommand'

export default function ScanScreen({ go }) {
  const { videoRef, startCamera, stopCamera, error: cameraError } = useMediaPipe()
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  // Estados de control de flujo e imágenes
  const [previewSrc, setPreviewSrc] = useState(null) // Para mostrar la foto tomada en la UI
  const [rawBase64, setRawBase64] = useState(null)   // Cadena limpia para enviar al Backend
  const [loading, setLoading] = useState(false)
  const [manualError, setManualError] = useState(null)
  
  // Estado para almacenar la respuesta del Servidor (FastAPI)
  const [scanResult, setScanResult] = useState(null)

  // Referencias mutables para mantener los comandos sincronizados sin re-renders
  const actionsRef = useRef(null)

  // 1. Lógica para capturar el frame actual del Video y congelar la pantalla
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // Creamos un canvas auxiliar en memoria con las dimensiones reales del video
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    
    const ctx = tempCanvas.getContext('2d')
    
    // Dibujamos el frame actual del video en el canvas
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height)
    
    // Generamos el DataURL completo para la etiqueta <img> del frontend
    const fullDataUrl = tempCanvas.toDataURL('image/jpeg')
    
    // Extraemos la cadena Base64 pura (removiendo el encabezado "data:image/jpeg;base64,")
    const cleanBase64 = fullDataUrl.split(',')[1]

    setPreviewSrc(fullDataUrl)
    setRawBase64(cleanBase64)
    setScanResult(null) // Resetea resultados anteriores si los hubiera
    stopCamera()        // Apagamos la cámara web para ahorrar recursos del sistema
  }, [videoRef, stopCamera])

  // 2. Lógica para descartar la foto fea y reactivar la cámara en vivo
  const retakePhoto = useCallback(() => {
    setPreviewSrc(null)
    setRawBase64(null)
    setScanResult(null)
    setManualError(null)
    startCamera() // Encendemos la cámara web de nuevo
  }, [startCamera])

  // 3. Petición HTTP POST al Backend (FastAPI)
  const sendPhotoToAI = useCallback(async (base64String) => {
    const stringToProcess = base64String || rawBase64
    if (!stringToProcess) {
      setManualError('Primero debes capturar una fotografía de tu entorno.')
      return
    }

    setLoading(true)
    setManualError(null)

    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
      
      const response = await fetch(`${API_BASE}/scan/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: stringToProcess })
      })

      if (!response.ok) {
        throw new Error('El servidor de IA no respondió correctamente.')
      }

      const data = await response.json()
      setScanResult(data) // Almacenamos detected_items y scan_message
    } catch (err) {
      setManualError(err.message || 'Error de conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }, [rawBase64])

  // Sincronizamos las funciones en la referencia para el asistente de voz
  actionsRef.current = { capturePhoto, retakePhoto, sendPhotoToAI, go }

  // Inicialización de la cámara al montar la pantalla
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // Configuración del Asistente de Voz Manos Libres
  useEffect(() => {
    const commands = {
      'capturar':     () => actionsRef.current.capturePhoto(),
      'tomar foto':   () => actionsRef.current.capturePhoto(),
      
      'otra foto':    () => actionsRef.current.retakePhoto(),
      'reintentar':   () => actionsRef.current.retakePhoto(),
      
      'enviar':       () => actionsRef.current.sendPhotoToAI(),
      'analizar':     () => actionsRef.current.sendPhotoToAI(),
      
      'confirmar':    () => actionsRef.current.go('workout'),
      'entrenar':     () => actionsRef.current.go('workout'),
      
      'volver':       () => actionsRef.current.go('planner'),
      'atrás':        () => actionsRef.current.go('planner'),
      'dashboard':    () => actionsRef.current.go('dashboard'),
    }

    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening])

  const displayError = cameraError || manualError

  return (
    <div style={{ flex: 1, background: 'linear-gradient(160deg,#0d1117,#0f1a14)', minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      
      {/* Rejilla de escaneo de fondo (Solo visible si la cámara está activa) */}
      {!previewSrc && (
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(74,222,128,0.02) 40px, rgba(74,222,128,0.02) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(74,222,128,0.02) 40px, rgba(74,222,128,0.02) 41px)', pointerEvents: 'none' }} />
      )}

      {/* Barra superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 }}>
        <button className="back-btn" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => go('planner')}>
          ← Volver
        </button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700 }}>Escáner de Entorno</span>
        {isListening && <span className="badge badge-green">🎤 Escuchando</span>}
      </div>

      {/* Contenedor del Visor Principal */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px', aspectRatio: '4/3', border: `2px solid ${displayError ? 'rgba(244,63,94,0.5)' : 'rgba(74,222,128,0.35)'}`, borderRadius: '16px', overflow: 'hidden', background: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          
          {previewSrc ? (
            /* VISTA PREVIA: Muestra la foto fija tomada */
            <img 
              src={previewSrc} 
              alt="Entorno capturado" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            /* EN VIVO: Transmisión directa de la cámara */
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              playsInline
              muted
            />
          )}

          {/* Estado de carga (Spinner Overlay) */}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(74,222,128,0.2)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '12px', color: '#4ade80' }}>IA analizando objetos...</span>
            </div>
          )}

          {/* Alertas de error */}
          {displayError && !loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px', fontSize: '12px' }}>
              ⚠️ {displayError}
            </div>
          )}
        </div>

        {/* CONTROLES TÁCTILES DINÁMICOS */}
        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', gap: '10px' }}>
          {!previewSrc ? (
            /* 1. Estado inicial: Solo capturar */
            <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={capturePhoto}>
              📸 Capturar entorno
            </button>
          ) : (
            /* 2. Estado capturado o analizado */
            <>
              <button className="btn-secondary" style={{ flex: 1, fontSize: '13px' }} onClick={retakePhoto} disabled={loading}>
                🔄 Otra foto
              </button>
              
              {scanResult ? (
                /* 🌟 SI YA HAY RESULTADOS: El botón muta a la acción final */
                <button 
                  className="btn-primary" 
                  style={{ flex: 1.5, fontSize: '13px', background: '#22c55e', animation: 'pulse 2s infinite' }} 
                  onClick={() => go('workout')}
                >
                  💪 Confirmar y entrenar →
                </button>
              ) : (
                /* SI NO HAY RESULTADOS AÚN: Botón normal de enviar */
                <button 
                  className="btn-primary" 
                  style={{ flex: 1.5, fontSize: '13px', background: 'var(--accent)' }} 
                  onClick={() => sendPhotoToAI()} 
                  disabled={loading}
                >
                  🚀 Analizar equipo
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* RESULTADOS DE LA INTELIGENCIA ARTIFICIAL */}
      <div style={{ flex: 1, width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {scanResult ? (
          <>
            {/* Mensaje global de la IA */}
            <div className="glass" style={{ borderRadius: '12px', padding: '14px', borderLeft: '4px solid #4ade80' }}>
              <div className="label" style={{ fontSize: '10px', marginBottom: '4px' }}>Respuesta de GymAI</div>
              <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{scanResult.scan_message}</p>
            </div>

            {/* Listado detallado de rutinas / equipamiento útil encontrado */}
            <div className="glass2" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="label" style={{ marginBottom: '4px' }}>Elementos Detectados</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {scanResult.detected_items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
                    <span className={`badge ${item.is_usable ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                      {item.is_usable ? 'Útil para entrenar' : 'No deportivo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de confirmación final para avanzar al entrenamiento */}
            <button className="btn-primary" style={{ marginTop: 'auto', padding: '14px', background: 'var(--accent)' }} onClick={() => go('workout')}>
              Confirmar y entrenar →
            </button>
          </>
        ) : (
          /* Estado vacío informativo */
          <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.35, padding: '20px' }}>
            <p style={{ fontSize: '13px' }}>
              {!previewSrc 
                ? 'Captura una fotografía para identificar qué elementos tienes disponibles en tu espacio.' 
                : 'Presiona "Analizar equipo" para enviar la foto al cerebro de la Inteligencia Artificial.'}
            </p>
          </div>
        )}
      </div>

      {/* Glosario inferior de comandos de voz */}
      {isListening && (
        <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text3)', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', width: 'fit-content', margin: '0 auto' }}>
          🗣️ Comandos: {!previewSrc ? '"capturar", "volver"' : '"analizar", "otra foto", "volver"'}
        </div>
      )}
    </div>
  )
}