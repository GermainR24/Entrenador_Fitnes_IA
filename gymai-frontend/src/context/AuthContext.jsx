import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const TOKEN_KEY = 'gymai_token'

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [token,        setToken]        = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loadingAuth,  setLoadingAuth]  = useState(true)  // true mientras valida el token guardado

  useEffect(() => {
    async function validateSavedToken() {
      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (!savedToken) {
        setLoadingAuth(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          setToken(savedToken)
        } else {
          // Token expirado o inválido → limpiar
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        }
      } catch {
        // Sin conexión → mantener token para reintentar luego
        console.warn('No se pudo validar el token guardado.')
      } finally {
        setLoadingAuth(false)
      }
    }
    validateSavedToken()
  }, [])

  // ── login: guarda token y usuario en estado + localStorage ──────────────────
  const login = useCallback((userData, accessToken) => {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem(TOKEN_KEY, accessToken)
  }, [])

  // ── logout: limpia todo ──────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
  }, [])


  const authFetch = useCallback(async (path, options = {}) => {
    const currentToken = localStorage.getItem(TOKEN_KEY)
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
    })
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loadingAuth,
      isAuthenticated: !!user,
      login,
      logout,
      authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}