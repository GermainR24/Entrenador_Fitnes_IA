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
import RestScreen       from './screens/RestScreen.jsx'
import HistoryScreen    from './screens/HistoryScreen.jsx'
import BlindScreen      from './screens/BlindScreen.jsx'

// Shared components
import BottomNav from './components/shared/BottomNav.jsx'

// ─── Registro de pantallas oficiales ──────────────────────────────────────────
const SCREENS = [
  { id: 'onboarding', label: 'Inicio',     Component: OnboardingScreen },
  { id: 'login',      label: 'Login',      Component: LoginScreen      },
  { id: 'register',   label: 'Registro',   Component: RegisterScreen   },
  { id: 'dashboard',  label: 'Dashboard',  Component: DashboardScreen  },
  { id: 'planner',    label: 'Planif.',    Component: PlannerScreen    },
  { id: 'weekly',     label: 'Semana',     Component: WeeklyScreen     },
  { id: 'scan',       label: 'Escaneo',    Component: ScanScreen       },
  { id: 'workout',    label: 'Entreno',    Component: WorkoutScreen    },
  { id: 'rest',       label: 'Descanso',   Component: RestScreen       },
  { id: 'history',    label: 'Historial',  Component: HistoryScreen    },
  { id: 'blind',      label: 'Ciego',      Component: BlindScreen      },
]

// ─── Manejador de enrutamiento nativo e historial ──────────────────────────────
function AppRouter() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentScreen, setCurrentScreen] = useState('onboarding')

  // Sincronizar el historial del dispositivo con el estado de React
  useEffect(() => {
    const path = location.pathname.substring(1)
    if (path && SCREENS.some(s => s.id === path)) {
      setCurrentScreen(path)
    } else {
      setCurrentScreen('onboarding')
      navigate('/onboarding', { replace: true })
    }
  }, [location, navigate])

  // Función puente go() que actualiza tanto la URL como la memoria
  const go = (screenId) => {
    setCurrentScreen(screenId)
    navigate(`/${screenId}`)
  }

  const active = SCREENS.find(s => s.id === currentScreen)
  const { Component } = active
  const pantallasSinNavbar = ['onboarding', 'login', 'register', 'blind']
  const mostrarNavbar = !pantallasSinNavbar.includes(currentScreen)


  return (
    <div className="wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Contenedor dinámico de pantalla */}
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

// ─── Componente raíz global ─────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <AppRouter />
    </HashRouter>
  )
}