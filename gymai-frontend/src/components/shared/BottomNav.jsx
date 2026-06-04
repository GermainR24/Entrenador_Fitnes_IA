export default function BottomNav({ screens, currentScreen, go }) {
  return (
    <div className="tab-bar">
      {screens.map(({ id, label }) => (
        <button
          key={id}
          className={`tab-btn${currentScreen === id ? ' active' : ''}`}
          onClick={() => go(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
