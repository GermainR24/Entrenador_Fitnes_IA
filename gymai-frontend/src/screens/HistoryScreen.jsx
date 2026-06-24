// screens/HistoryScreen.jsx
import { useState, useEffect } from 'react'
import ProgressChart from '../components/svg/ProgressChart.jsx'
import HombreFrontal from '../components/svg/HombreFrontal.jsx'
import { mapIdsToSlugs } from '../components/svg/muscleIdToSlug.js'
import useVoiceCommand from '../hooks/useVoiceCommand'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

// --- FUNCIÓN MATEMÁTICA TRANSFORMADORA CON PADDING ---
const generateSvgPoints = (historyArray, minW, maxW, svgWidth = 300, svgHeight = 100) => {
  if (!historyArray || historyArray.length === 0) return "";
  if (historyArray.length === 1) return `0,${svgHeight/2} ${svgWidth},${svgHeight/2}`;

  // Margen interno para que la curva no choque con los bordes
  const padX = 12;
  const padY = 12;
  const drawWidth = svgWidth - (padX * 2);
  const drawHeight = svgHeight - (padY * 2);

  const points = historyArray.map((item, index) => {
    const x = padX + (index / (historyArray.length - 1)) * drawWidth;
    
    const y = maxW === minW 
      ? svgHeight / 2 
      : padY + drawHeight - ((item.weight_kg - minW) / (maxW - minW)) * drawHeight;
      
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return points.join(" ");
};

// --- FUNCIÓN DE AGREGACIÓN Y VENTANA DESLIZANTE ---
const processWeeklyData = (rawHistory, maxWeeks = 12) => {
  if (!rawHistory || rawHistory.length === 0) return [];

  const weeklyData = {};

  rawHistory.forEach(item => {
    const date = new Date(item.date);
    const day = date.getDay() === 0 ? 7 : date.getDay();
    const diff = date.getDate() - day + 1;
    const monday = new Date(date.setDate(diff));
    monday.setHours(0,0,0,0);
    
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeklyData[weekKey] || item.weight_kg > weeklyData[weekKey].weight_kg) {
      weeklyData[weekKey] = {
        date: weekKey,
        weight_kg: item.weight_kg,
        label: `${monday.getDate()} ${monday.toLocaleString('es-ES', { month: 'short' })}`
      };
    }
  });

  return Object.values(weeklyData)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-maxWeeks); 
};


export default function HistoryScreen({ go }) {
  const [exIdx, setExIdx] = useState(0)
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()

  const [chartData, setChartData] = useState({ exercises: [], history: {} })
  const [loading, setLoading] = useState(true)

  // --- MOCK TEMPORAL PARA PROBAR EL GRÁFICO (Reemplazar con fetch real luego) ---
    useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/history/chart`)
        if (response.ok) {
          const data = await response.json()
          setChartData(data)
        }
      } catch (error) {
        console.error("Error cargando historial desde la API:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const changeExercise = (delta) => {
    if (chartData.exercises.length === 0) return;
    setExIdx(prev => (prev + delta + chartData.exercises.length) % chartData.exercises.length)
  }

  useEffect(() => {
    const commands = {
      'volver': () => go('dashboard'),
      'atrás': () => go('dashboard'),
      'dashboard': () => go('dashboard'),
      'siguiente ejercicio': () => changeExercise(1),
      'siguiente': () => changeExercise(1),
      'anterior ejercicio': () => changeExercise(-1),
      'anterior': () => changeExercise(-1),
      'inicio': () => go('dashboard'),
      'menú principal': () => go('dashboard'),
    }
    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening, go, chartData.exercises.length]) 

  // --- VARIABLES DINÁMICAS PARA EL RENDER ---
  const currentExercise = chartData.exercises[exIdx] || "Sin datos"
  const rawHistory = chartData.history[currentExercise] || []
  const weeklyHistory = processWeeklyData(rawHistory, 12) 

  // Límites Eje Y
  const weights = weeklyHistory.map(item => item.weight_kg);
  const chartMin = weights.length > 0 ? Math.floor(Math.min(...weights) - 5) : 0;
  const chartMax = weights.length > 0 ? Math.ceil(Math.max(...weights) + 5) : 0;
  const chartMid = ((chartMax + chartMin) / 2).toFixed(1);

  const currentSvgPoints = generateSvgPoints(weeklyHistory, chartMin, chartMax)

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
        <p>Analizando progreso histórico...</p>
      </div>
    )
  }

  return (
    <>
      <div className="nav-bar">
        <button className="back-btn" onClick={() => go('dashboard')}>← Volver</button>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700 }}>
          Historial
        </span>
        {isListening && (
          <span style={{
            marginLeft: 'auto', backgroundColor: '#22c55e', borderRadius: '20px',
            padding: '2px 10px', fontSize: '10px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <span>🎤</span> Escuchando
          </span>
        )}
      </div>

      <div className="screen-body">
        {isListening && (
          <p style={{ fontSize: '11px', color: '#4ade80', marginTop: '-8px', marginBottom: '8px' }}>
            🗣️ Comandos: "siguiente ejercicio", "anterior", "volver", "inicio"
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <StatCard value="12"   label="Semanas"  color="74,222,128"  /> 
          <StatCard value="+20%" label="Progreso"  color="34,211,238"  />
          <StatCard value="12🔥" label="Racha"     color="245,158,11"  />
        </div>

        <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div className="label" style={{ marginBottom: '2px' }}>Progreso de carga</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 600 }}>
                {currentExercise}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '14px' }}
                onClick={() => changeExercise(-1)}
              >‹</button>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '14px' }}
                onClick={() => changeExercise(1)}
              >›</button>
            </div>
          </div>

          {/* Gráfico Dinámico con Eje Y */}
          {chartData.exercises.length > 0 ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                paddingBottom: '20px', 
                fontSize: '10px', 
                color: 'var(--text3)',
                fontWeight: '600',
                textAlign: 'right',
                minWidth: '28px' 
              }}>
                <span>{chartMax}</span>
                <span>{chartMid}</span>
                <span>{chartMin}</span>
              </div>

              <div style={{ flex: 1, paddingRight: '8px' /* Espacio extra a la derecha */}}>
                <ProgressChart points={currentSvgPoints} />
                
                {/* Eje X Dinámico (Posicionamiento Absoluto para evitar desbordamiento) */}
                <div style={{ position: 'relative', height: '16px', marginTop: '8px', width: '100%' }}>
                  {weeklyHistory.map((item, idx) => {
                    const total = weeklyHistory.length;
                    
                    // Lógica IHC: Si hay muchas semanas, filtramos para no amontonar el texto
                    let showLabel = true;
                    if (total > 5) {
                      const step = Math.ceil(total / 4); // Dividimos en 4 segmentos
                      showLabel = (idx === 0) || (idx === total - 1) || (idx % step === 0);
                    }
                    
                    if (!showLabel) return null;

                    // Matemática: Calculamos en qué porcentaje del ancho está este punto (igual que el SVG)
                    const percentX = (idx / (total - 1)) * 100;
                    
                    // Ajustamos la alineación del texto para que no se salga por los bordes izquierdo/derecho
                    let transform = 'translateX(-50%)'; // Centrado por defecto
                    if (idx === 0) transform = 'translateX(0)'; // El primero se alinea a la izquierda
                    if (idx === total - 1) transform = 'translateX(-100%)'; // El último a la derecha

                    return (
                      <span 
                        key={idx} 
                        style={{ 
                          position: 'absolute', 
                          left: `${percentX}%`, 
                          transform: transform,
                          fontSize: '10px', 
                          color: 'var(--text3)', 
                          whiteSpace: 'nowrap' 
                        }}
                      >
                        {item.label}
                      </span>
                    )
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
              Registra tu primer entrenamiento para ver la gráfica
            </div>
          )}
        </div>

        <div className="glass" style={{ borderRadius: 'var(--r2)', padding: '16px', textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: '8px' }}>Volumen muscular acumulado</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HombreFrontal
              activeIds={mapIdsToSlugs(['chest', 'lshoulder', 'rshoulder', 'lquad', 'rquad'])}
              width={200}
            />
          </div>
        </div>

        <button className="btn-primary" onClick={() => go('dashboard')} style={{marginTop: '10px'}}>
          Volver al inicio
        </button>
      </div>
    </>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      flex: 1,
      background: `rgba(${color},0.08)`,
      border: `1px solid rgba(${color},0.2)`,
      borderRadius: '12px',
      padding: '12px',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, color: `rgb(${color})` }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}