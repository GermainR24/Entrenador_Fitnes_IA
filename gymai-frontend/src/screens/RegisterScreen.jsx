import { useState } from 'react'
import useAuth from '../hooks/useAuth.js'

export default function RegisterScreen({ go }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [perfil, setPerfil] = useState('estandar')

  const { loading, error, registerUser } = useAuth()

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

  async function handleRegister() {
    const res = await registerUser(email, password, name, perfil)
    if (res && res.usuario) {
      go('dashboard')
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '24px',
    }}>
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
          Crea tu cuenta para comenzar
        </p>
      </div>

      <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Nombre completo</label>
          <input
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

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

        <div>
          <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Perfil</label>
          <select value={perfil} onChange={e => setPerfil(e.target.value)} style={{ ...inputStyle, padding: '10px 14px' }}>
            <option value="estandar">Estándar</option>
            <option value="accesible">Accesible</option>
            <option value="ciego">Ciego</option>
          </select>
        </div>

        <button className="btn-primary" onClick={handleRegister} disabled={loading}>
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>

        {error && <div style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</div>}

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
          ¿Ya tienes cuenta?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => go('login')}>Inicia sesión</span>
        </p>
      </div>

      <button className="btn-ghost" onClick={() => go('onboarding')}>
        ← Volver al inicio
      </button>
    </div>
  )
}
