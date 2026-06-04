export default function TimerCircle({ seconds, maxSeconds, label }) {
  const CIRCUMFERENCE = 364 // 2π × r(58)
  const offset = CIRCUMFERENCE * (1 - seconds / maxSeconds)

  return (
    <div className="timer-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Track */}
        <circle
          cx="70" cy="70" r="58"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="70" cy="70" r="58"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="timer-text">{label}</div>
    </div>
  )
}
