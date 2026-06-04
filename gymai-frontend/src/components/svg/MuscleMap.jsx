const MUSCLES = [
  { id: 'neck',      x: 40, y: 8,   w: 40, h: 22, rx: 4 },
  { id: 'lshoulder', x: 28, y: 28,  w: 16, h: 20, rx: 4 },
  { id: 'rshoulder', x: 76, y: 28,  w: 16, h: 20, rx: 4 },
  { id: 'chest',     x: 40, y: 28,  w: 40, h: 30, rx: 4 },
  { id: 'larm',      x: 28, y: 50,  w: 14, h: 26, rx: 4 },
  { id: 'rarm',      x: 78, y: 50,  w: 14, h: 26, rx: 4 },
  { id: 'lcore',     x: 40, y: 60,  w: 18, h: 25, rx: 3 },
  { id: 'rcore',     x: 62, y: 60,  w: 18, h: 25, rx: 3 },
  { id: 'lquad',     x: 35, y: 88,  w: 22, h: 35, rx: 4 },
  { id: 'rquad',     x: 63, y: 88,  w: 22, h: 35, rx: 4 },
  { id: 'lcalf',     x: 30, y: 126, w: 20, h: 40, rx: 4 },
  { id: 'rcalf',     x: 70, y: 126, w: 20, h: 40, rx: 4 },
]

export default function MuscleMap({
  activeIds = [],
  tiredIds  = [],
  painIds   = [],
  onToggle  = null,
  width     = 90,
  height    = 135,
}) {
  function getClassName(id) {
    if (painIds.includes(id))   return 'muscle pain'
    if (activeIds.includes(id)) return 'muscle active'
    if (tiredIds.includes(id))  return 'muscle tired'
    return 'muscle'
  }

  return (
    <svg
      viewBox="0 0 120 180"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {MUSCLES.map(({ id, x, y, w, h, rx }) => (
        <rect
          key={id}
          className={getClassName(id)}
          x={x} y={y} width={w} height={h} rx={rx}
          onClick={onToggle ? () => onToggle(id) : undefined}
          style={onToggle ? { cursor: 'pointer' } : undefined}
        />
      ))}
    </svg>
  )
}

// Export the full muscles list so other screens can reference IDs
export { MUSCLES }
