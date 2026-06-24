import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export default function useAuthApi() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const { login } = useAuth()

  async function loginUser(email, password) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail ?? 'Error al iniciar sesión')
        return null
      }
      // Guardar en contexto + localStorage
      login(data.usuario, data.token)
      return data
    } catch (err) {
      setError('No se pudo conectar con el servidor')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function registerUser(email, password, full_name, perfil = 'estandar') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail ?? 'Error al registrarse')
        return null
      }
      // Guardar en contexto + localStorage
      login(data.usuario, data.token)
      return data
    } catch (err) {
      setError('No se pudo conectar con el servidor')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loginUser, registerUser, loading, error }
}