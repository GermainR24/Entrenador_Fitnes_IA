import { useState } from 'react'

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

// ─── Screen registry ──────────────────────────────────────────────────────────
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

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('onboarding')

  // Single navigation function replaces go() from vanilla JS
  const go = (screenId) => setCurrentScreen(screenId)

  // Find the active screen entry
  const active = SCREENS.find(s => s.id === currentScreen)
  const { Component } = active

  return (
    <div className="wrapper">
      {/* Active screen — key forces re-mount (and fadeIn animation) on navigate */}
      <div className="screen" key={currentScreen}>
        <Component go={go} />
      </div>

      {/* Prototype tab bar — replaces the HTML tab-bar */}
      <BottomNav
        screens={SCREENS}
        currentScreen={currentScreen}
        go={go}
      />
    </div>
  )
}
