import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export default function useAuthApi() {
  const { login, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function loginUser(email, password, perfil_accesibilidad = 'estandar') {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, perfil_accesibilidad }),
      })
      if (!res.ok) throw new Error('Credenciales incorrectas')
      const data = await res.json()
      // Backend contract: { status, token, usuario }
      if (data.usuario) login(data.usuario)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function registerUser(email, password, name, perfil_accesibilidad = 'estandar') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: name, perfil_accesibilidad }),
      })
      if (!res.ok) throw new Error('Error al registrar usuario')
      const data = await res.json()
      // Backend contract: { status, token, usuario }
      if (data.usuario) login(data.usuario)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, loginUser, registerUser, logout }
}
