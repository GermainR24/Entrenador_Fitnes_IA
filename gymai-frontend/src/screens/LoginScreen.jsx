import { useState, useEffect } from 'react'
import useVoiceCommand from '../hooks/useVoiceCommand'
import useAuthApi from '../hooks/useAuth.js' 

export default function LoginScreen({ go }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  
  const { isListening, listenForCommands, stopListening } = useVoiceCommand()
  const { loginUser, loading, error } = useAuthApi() 

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

  const fillDemo = () => {
    setEmail('demo@gymai.com')
    setPassword('demo1234')
  }

  const clearFields = () => {
    setEmail('')
    setPassword('')
  }

  // 3. Creamos la función que conecta React con FastAPI
  const handleLogin = async () => {
    if (!email || !password) return // Evitamos peticiones vacías

    // Llamamos al backend. Si es exitoso, devuelve la data. Si falla, devuelve null.
    const data = await loginUser(email, password)
    
    // Si la data existe (el backend nos dio el token y el usuario), navegamos
    if (data) {
      go('dashboard')
    }
  }

  useEffect(() => {
    const commands = {
      // 4. Actualizamos el comando de voz para que también valide el login real
      'iniciar sesión': () => handleLogin(),
      'entrar': () => handleLogin(),
      'login': () => handleLogin(),
      
      'registrarme': () => go('register'),
      'registro': () => go('register'),
      'volver': () => go('onboarding'),
      'atrás': () => go('onboarding'),
      'inicio': () => go('onboarding'),

      'demo': () => fillDemo(),
      'llenar demo': () => fillDemo(),
      'limpiar': () => clearFields(),
      'borrar': () => clearFields(),
    }

    listenForCommands(commands, true)
    return () => stopListening()
  }, [listenForCommands, stopListening, go, email, password]) // Agregamos dependencias

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '24px',
    }}>
      {/* ... (Todo tu código superior de logos y micrófono sigue igual) ... */}

      {/* Formulario */}
      <div className="glass2" style={{ borderRadius: 'var(--r2)', padding: '24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* 5. Si FastAPI devuelve un error 401, lo mostramos en rojo */}
        {error && (
          <div style={{ background: 'rgba(244,63,94,0.1)', color: '#fda4af', padding: '10px', borderRadius: '8px', fontSize: '13px', textAlign: 'center', border: '1px solid rgba(244,63,94,0.3)' }}>
            ⚠️ {error}
          </div>
        )}

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
        
        {/* 6. Conectamos el botón a handleLogin y lo bloqueamos si está cargando */}
        <button 
          className="btn-primary" 
          onClick={handleLogin}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Verificando...' : 'Iniciar sesión'}
        </button>
        
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text3)' }}>
          ¿No tienes cuenta?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => go('register')}>Regístrate</span>
        </p>
      </div>

      <button className="btn-ghost" onClick={() => go('onboarding')}>
        ← Volver al inicio
      </button>

      {/* ... (Código de ayuda de comandos sigue igual) ... */}
    </div>
  )
}