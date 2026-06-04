export default function ProgressChart({ points }) {
  const fillPoints = `${points} 300,80 0,80`

  return (
    <svg
      width="100%"
      height="80"
      viewBox="0 0 300 80"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0"   />
        </linearGradient>
      </defs>

      {/* Filled area under the line */}
      <polygon fill="url(#chartGrad)" points={fillPoints} />

      {/* The line itself */}
      <polyline
        fill="none"
        stroke="#4ade80"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      {/* Endpoint dot — parse last coord from points string */}
      <EndDot points={points} />
    </svg>
  )
}

/** Parses the last x,y pair from a polyline points string and renders a dot */
function EndDot({ points }) {
  const pairs = points.trim().split(' ')
  const last  = pairs[pairs.length - 1].split(',')
  const cx = parseFloat(last[0])
  const cy = parseFloat(last[1])
  return <circle cx={cx} cy={cy} r="4" fill="#4ade80" />
}
