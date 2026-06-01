import { useState } from 'react'

export default function LoginScreen({ go }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  const inputStyle = {
    width: '100%',
    background: 'var(--glass)',
    border: '1px solid var(--border2)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 800 }}>GymAI</div>
        <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '6px' }}>
          Tu entrenador de inteligencia artificial
        </p>
      </div>

      {/* Form */}
      <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Email</label>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button className="btn-primary" onClick={() => go('dashboard')}>
          Iniciar sesión
        </button>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
          ¿No tienes cuenta?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => go('register')}>Regístrate</span>
        </p>
      </div>

      <button className="btn-ghost" onClick={() => go('onboarding')}>
        ← Volver al inicio
      </button>
    </div>
  )
}
