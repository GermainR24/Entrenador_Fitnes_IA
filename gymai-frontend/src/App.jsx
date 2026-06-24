import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'

// Screens
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import LoginScreen      from './screens/LoginScreen.jsx'
import RegisterScreen   from './screens/RegisterScreen.jsx'
import DashboardScreen  from './screens/DashboardScreen.jsx'
import PlannerScreen    from './screens/PlannerScreen.jsx'
import WeeklyScreen     from './screens/WeeklyScreen.jsx'
import ScanScreen       from './screens/ScanScreen.jsx'
import WorkoutScreen    from './screens/WorkoutScreen.jsx'
import HistoryScreen    from './screens/HistoryScreen.jsx'
import BlindScreen      from './screens/BlindScreen.jsx'

// Shared components
import BottomNav from './components/shared/BottomNav.jsx'

// Contextos globales
import { WorkoutProvider } from './context/WorkoutContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

// ─── Pantallas que NO requieren sesión ────────────────────────────────────────
const PUBLIC_SCREENS  = ['onboarding', 'login', 'register', 'blind']
const SCREENS_SIN_NAV = ['onboarding', 'login', 'register', 'blind']

const SCREENS = [
  { id: 'onboarding', label: 'Inicio',    Component: OnboardingScreen },
  { id: 'login',      label: 'Login',     Component: LoginScreen      },
  { id: 'register',   label: 'Registro',  Component: RegisterScreen   },
  { id: 'dashboard',  label: 'Dashboard', Component: DashboardScreen  },
  { id: 'planner',    label: 'Planif.',   Component: PlannerScreen    },
  { id: 'weekly',     label: 'Semana',    Component: WeeklyScreen     },
  { id: 'scan',       label: 'Escaneo',   Component: ScanScreen       },
  { id: 'workout',    label: 'Entreno',   Component: WorkoutScreen    },
  { id: 'history',    label: 'Historial', Component: HistoryScreen    },
  { id: 'blind',      label: 'Ciego',     Component: BlindScreen      },
]

// ─── Router interno ───────────────────────────────────────────────────────────
function AppRouter() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loadingAuth } = useAuth()
  const [currentScreen, setCurrentScreen] = useState('onboarding')

  useEffect(() => {
    const path = location.pathname.substring(1)
    const screen = SCREENS.find(s => s.id === path)
    if (screen) {
      setCurrentScreen(path)
    } else {
      setCurrentScreen('onboarding')
      navigate('/onboarding', { replace: true })
    }
  }, [location, navigate])

  // ── Protección de rutas ──────────────────────────────────────────────────
  // Mientras valida el token guardado, no redirige todavía
  useEffect(() => {
    if (loadingAuth) return
    const isPublic = PUBLIC_SCREENS.includes(currentScreen)
    if (!isAuthenticated && !isPublic) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loadingAuth, currentScreen, navigate])

  const go = (screenId) => {
    setCurrentScreen(screenId)
    navigate(`/${screenId}`)
  }

  // Mientras valida el token, mostrar pantalla de carga mínima
  if (loadingAuth) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', minHeight: '100vh' }}>
        <div style={{ color: 'var(--accent)', fontSize: '14px' }}>Cargando...</div>
      </div>
    )
  }

  const active = SCREENS.find(s => s.id === currentScreen) ?? SCREENS[0]
  const { Component } = active
  const mostrarNavbar = !SCREENS_SIN_NAV.includes(currentScreen)

  return (
    <div className="wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="screen" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Component go={go} />
      </div>
      {mostrarNavbar && (
        <BottomNav
          screens={SCREENS}
          currentScreen={currentScreen}
          go={go}
        />
      )}
    </div>
  )
}

// ─── Componente raíz ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <WorkoutProvider>
          <AppRouter />
        </WorkoutProvider>
      </AuthProvider>
    </HashRouter>
  )
}