// components/svg/ProgressChart.jsx

export default function ProgressChart({ points, width = 300, height = 100 }) {
  // 1. Si no hay puntos, no renderizamos nada para evitar errores
  if (!points || points.trim() === "") return null;

  // 2. Extraemos las coordenadas del primer y último punto matemáticamente
  const pointsArray = points.trim().split(' ')
  const firstX = pointsArray[0].split(',')[0]
  const lastX  = pointsArray[pointsArray.length - 1].split(',')[0]

  // 3. Cerramos el polígono cayendo en línea recta desde los extremos exactos
  const fillPoints = `${points} ${lastX},${height} ${firstX},${height}`

  return (
    <svg
      width="100%"
      height="100%" 
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="none"
      style={{ 
        minHeight: '80px', 
        display: 'block',
        overflow: 'visible' // <-- Esta es la clave para que el punto no se corte
      }} 
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0"   />
        </linearGradient>
      </defs>

      <polygon fill="url(#chartGrad)" points={fillPoints} />

      <polyline
        fill="none"
        stroke="#4ade80"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      <EndDot points={points} />
    </svg>
  )
}

function EndDot({ points }) {
  if (!points || points.trim() === "") return null;
  const pairs = points.trim().split(' ')
  const last  = pairs[pairs.length - 1].split(',')
  const cx = parseFloat(last[0])
  const cy = parseFloat(last[1])
  
  return <circle cx={cx} cy={cy} r="4" fill="#4ade80" />
}