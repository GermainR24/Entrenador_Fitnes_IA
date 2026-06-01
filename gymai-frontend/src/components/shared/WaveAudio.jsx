export default function WaveAudio({ barCount = 8, style = {} }) {
  return (
    <div className="wave" style={style}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div key={i} className="wave-bar" />
      ))}
    </div>
  )
}
