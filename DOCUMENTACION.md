# Entrenador Fitness IA — Documentación Técnica

> Aplicación móvil/web de entrenamiento personal asistida por inteligencia artificial, visión computacional y control por voz.

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Instalación y Configuración](#5-instalación-y-configuración)
6. [Backend — Módulos y Endpoints](#6-backend--módulos-y-endpoints)
7. [Frontend — Pantallas y Flujos](#7-frontend--pantallas-y-flujos)
8. [Hooks Personalizados](#8-hooks-personalizados)
9. [Contextos Globales](#9-contextos-globales)
10. [Visión Computacional](#10-visión-computacional)
11. [Sistema de Voz](#11-sistema-de-voz)
12. [Flujo Completo de Datos](#12-flujo-completo-de-datos)
13. [API Reference](#13-api-reference)
14. [Modelos de Datos](#14-modelos-de-datos)
15. [Decisiones de Diseño](#15-decisiones-de-diseño)

---

## 1. Descripción General

**Entrenador Fitness IA** es una aplicación multiplataforma (web, móvil vía Capacitor, escritorio vía Electron) que actúa como entrenador personal inteligente. El usuario puede completar sesiones de entrenamiento guiadas por voz, con corrección postural en tiempo real mediante la cámara del dispositivo, y con adaptación dinámica de rutinas por inteligencia artificial.

### Características principales

- **Rutinas adaptadas por IA**: el usuario hace un check-in diario (nivel de energía y zonas de dolor) y la IA genera una rutina personalizada usando el modelo LLM Llama-3.3-70b vía Groq.
- **Corrección postural en tiempo real**: MediaPipe analiza el esqueleto del usuario frame a frame y detecta errores de ejecución (valgo de rodilla, balanceo de torso, rango incompleto, asimetría).
- **Conteo automático de repeticiones**: la IA cuenta las reps por análisis biomecánico del ángulo articular, con soporte de ejercicios unilaterales (izquierda/derecha por separado).
- **Control completamente por voz**: todas las pantallas aceptan comandos de voz en español (es-PE) para navegar, iniciar series, registrar dolores y ajustar parámetros.
- **Historial real**: cada sesión completada se guarda en la base de datos con ejercicios, series, reps y peso. El dashboard y el historial muestran estadísticas calculadas desde datos reales.
- **Autenticación segura**: registro y login con contraseñas hasheadas con bcrypt y tokens JWT firmados.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              React + Vite (gymai-frontend/)                 │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Planner   │  │Workout   │  │Weekly    │  │History   │   │
│  │Screen    │  │Screen    │  │Screen    │  │Screen    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐  │
│  │         AuthContext + WorkoutContext                   │  │
│  │         useVoiceCommand + useMediaPipe                 │  │
│  │         usePostureAnalysis + useAuth                   │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP + JWT
┌───────────────────────────▼─────────────────────────────────┐
│                        BACKEND                              │
│              FastAPI + Python (gymai-backend/)              │
│                                                             │
│  /auth    /routines    /history    /scan                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              SQLite (SQLModel ORM)                     │ │
│  │    User  |  WorkoutSession  |  ExerciseLog             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Groq API (llama-3.3-70b-versatile)           │ │
│  │     Adaptación de rutinas + Plan semanal IA            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.12 | Lenguaje principal |
| FastAPI | Latest | Framework HTTP |
| SQLModel | Latest | ORM + validación con Pydantic |
| SQLite | — | Base de datos (desarrollo) |
| passlib + bcrypt | Latest | Hasheo de contraseñas |
| python-jose | Latest | Generación y verificación de JWT |
| Groq SDK | Latest | Cliente para LLM (Llama-3.3-70b) |
| Uvicorn | Latest | Servidor ASGI |

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Framework UI |
| Vite | Latest | Build tool y dev server |
| @mediapipe/pose | Legacy | Detección de esqueleto (33 puntos) |
| Web Speech API | Browser | STT (reconocimiento de voz) + TTS (síntesis) |
| Capacitor | Latest | Empaquetado para móvil |
| Electron | Latest | Empaquetado para escritorio |

---

## 4. Estructura del Proyecto

```
Entrenador_Fitnes_IA/
├── gymai-frontend/
│   ├── src/
│   │   ├── App.jsx                      # Raíz: rutas, providers, protección de rutas
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   └── BottomNav.jsx        # Barra de navegación inferior
│   │   │   └── svg/
│   │   │       ├── HombreFrontal.jsx    # Mapa muscular vista frontal (SVG interactivo)
│   │   │       ├── HombreEspalda.jsx    # Mapa muscular vista espalda (SVG interactivo)
│   │   │       ├── ProgressChart.jsx   # Gráfico de progreso de carga
│   │   │       └── muscleIdToSlug.js   # Mapeo id → slug de músculo
│   │   ├── context/
│   │   │   ├── AuthContext.jsx          # Sesión de usuario + token JWT + authFetch
│   │   │   └── WorkoutContext.jsx       # Rutina activa + feel_value + pain_zones
│   │   ├── hooks/
│   │   │   ├── useAuth.js               # loginUser() + registerUser()
│   │   │   ├── useMediaPipe.js          # Cámara + esqueleto MediaPipe
│   │   │   ├── usePostureAnalysis.js    # Orquestador de análisis postural
│   │   │   ├── useVoiceCommand.js       # Web Speech API (STT)
│   │   │   └── exercises/              # Analizadores por ejercicio
│   │   │       ├── index.js            # Registro central de analizadores
│   │   │       ├── poseUtils.js        # Funciones puras de geometría
│   │   │       ├── squatAnalyzer.js    # Sentadilla
│   │   │       ├── shoulderLateralAnalyzer.js  # Elevaciones laterales
│   │   │       ├── benchPressAnalyzer.js       # Press de banca
│   │   │       └── rowAnalyzer.js      # Remo unilateral
│   │   └── screens/
│   │       ├── OnboardingScreen.jsx
│   │       ├── LoginScreen.jsx
│   │       ├── RegisterScreen.jsx
│   │       ├── DashboardScreen.jsx      # Estadísticas reales + mapa de fatiga
│   │       ├── PlannerScreen.jsx        # Check-in + split semanal + adaptación IA
│   │       ├── WeeklyScreen.jsx         # Plan semanal IA + historial de sesiones
│   │       ├── WorkoutScreen.jsx        # Entrenamiento en vivo con visión y voz
│   │       ├── HistoryScreen.jsx        # Gráfico de progreso + estadísticas reales
│   │       ├── ScanScreen.jsx           # Escáner de equipamiento (Gemini Vision)
│   │       └── BlindScreen.jsx          # Modo accesible
│   ├── electron/
│   │   ├── main.js
│   │   └── preload.js
│   ├── capacitor.config.json
│   └── vite.config.js
│
└── gymai-backend/
    └── app/
        ├── main.py                      # Punto de entrada FastAPI
        ├── api/
        │   ├── auth/
        │   │   ├── router.py            # POST /register, POST /login, GET /me
        │   │   ├── service.py           # Lógica de registro y login
        │   │   └── repository.py        # Acceso a BD para User
        │   ├── routines/
        │   │   ├── router.py            # POST /adapt, POST /weekly-plan
        │   │   ├── service.py           # Lógica de adaptación con IA
        │   │   └── repository.py        # Split semanal + rutina base
        │   ├── history/
        │   │   ├── router.py            # POST /save, GET /chart, GET /weekly
        │   │   └── repository.py        # Acceso a WorkoutSession + ExerciseLog
        │   └── scan/
        │       └── router.py            # POST /scan (Gemini Vision)
        ├── core/
        │   ├── config.py               # Variables de entorno (Settings)
        │   ├── db.py                   # Engine SQLite + init_db + get_session
        │   ├── middleware.py           # CORS
        │   ├── prompts.py              # System prompts para la IA
        │   └── security.py            # bcrypt + JWT
        ├── models/
        │   ├── user.py                 # User, UserCreate, UserLogin, AuthResponse
        │   ├── routine.py             # ExerciseItem, CheckInRequest, RoutineResponse
        │   └── history.py             # WorkoutSession, ExerciseLog, schemas
        └── services/
            └── llm_service.py         # Cliente Groq + analyze_equipment_image
```

---

## 5. Instalación y Configuración

### Requisitos previos

- Python 3.12+
- Node.js 18+
- Cuenta en [console.groq.com](https://console.groq.com) (gratuita)

### Backend

```bash
# 1. Entrar al directorio
cd gymai-backend

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# 3. Instalar dependencias
pip install -r requirements.txt
pip install bcrypt passlib python-jose[cryptography] groq

# 4. Crear archivo de variables de entorno
touch .env
```

Contenido del `.env`:

```env
GEMINI_API_KEY=AIza...          # Opcional, solo para ScanScreen
GROQ_API_KEY=gsk_...            # Requerido para rutinas y plan semanal
DATABASE_URL=sqlite:///./gym.db
SECRET_KEY=clave_secreta_larga_minimo_32_caracteres
```

```bash
# 5. Levantar el servidor
uvicorn app.main:app --reload --port 8000
```

Verificar en `http://localhost:8000/docs`

### Frontend

```bash
# 1. Entrar al directorio
cd gymai-frontend

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# 4. Levantar el servidor de desarrollo
npm run dev
```

Abrir `http://localhost:5173`

---

## 6. Backend — Módulos y Endpoints

### Punto de entrada (`app/main.py`)

Al iniciar la aplicación, FastAPI ejecuta `init_db()` que crea automáticamente todas las tablas en SQLite si no existen. Los cuatro routers se registran bajo el prefijo `/api/v1`.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()   # Crea tablas en SQLite al arrancar
    yield
```

### Base de datos (`app/core/db.py`)

Usa SQLite en desarrollo con SQLModel como ORM. La conexión se gestiona mediante sesiones inyectadas como dependencia en cada endpoint.

```python
engine = create_engine(url=settings.DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)   # Crea todas las tablas

def get_session():
    with Session(engine) as session:
        yield session                       # Inyección de dependencia
```

### Seguridad (`app/core/security.py`)

Implementa dos responsabilidades separadas: hasheo de contraseñas y gestión de JWT.

**Contraseñas:** usa `passlib` con el esquema `bcrypt`. Nunca se almacena la contraseña en texto plano.

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

**JWT:** tokens firmados con `HS256`, expiración de 7 días. El payload contiene `sub` (user_id) y `email`.

```python
def create_access_token(user_id: int, email: str) -> str:
    payload = {"sub": str(user_id), "email": email, "exp": ...}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def decode_access_token(token: str) -> dict | None:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
```

### Autenticación (`app/api/auth/`)

La dependency `get_current_user` se reutiliza en todos los endpoints protegidos. Extrae el token del header `Authorization: Bearer <token>`, lo decodifica y recupera el usuario de la BD.

```python
def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session) -> UserPublic:
    payload = decode_access_token(credentials.credentials)
    user_id = int(payload["sub"])
    return repo.get_by_id(user_id)
```

### Rutinas (`app/api/routines/`)

El repositorio implementa un split semanal de 7 días hardcodeado en código. El endpoint `/adapt` acepta un campo opcional `weekday` (0=lun…6=dom) para que el usuario pueda saltar a otro día.

**Lógica de eficiencia en `/adapt`:** si el usuario tiene energía ≥ 7 y no reporta dolor, se devuelve la rutina base sin llamar a la IA, ahorrando tokens.

```python
if not checkin.pain_zones and checkin.feel_value >= 7:
    return RoutineResponse(exercises=base_routine, ai_feedback="¡A tope!")
```

**Split semanal:**

| Weekday | Grupo muscular |
|---|---|
| 0 — Lunes | Pecho y Tríceps |
| 1 — Martes | Espalda y Bíceps |
| 2 — Miércoles | Piernas y Glúteos |
| 3 — Jueves | Hombros y Trapecios |
| 4 — Viernes | Pecho y Tríceps (vol. 2) |
| 5 — Sábado | Espalda y Bíceps (vol. 2) |
| 6 — Domingo | Core y Movilidad |

### Historial (`app/api/history/`)

Tres endpoints protegidos con JWT, todos filtrados por `current_user.id`:

- `POST /save` — guarda la sesión completa al terminar el entrenamiento.
- `GET /chart` — devuelve el historial agrupado por ejercicio para el gráfico de progreso.
- `GET /weekly` — devuelve las sesiones de los últimos 7 días para el Dashboard y WeeklyScreen.

### Servicio LLM (`app/services/llm_service.py`)

Usa el SDK de Groq con el modelo `llama-3.3-70b-versatile`. El parámetro `response_format={"type": "json_object"}` fuerza que la respuesta sea JSON válido, evitando errores de parseo.

```python
completion = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_data},
    ],
    response_format={"type": "json_object"},
)
```

Los prompts del sistema están centralizados en `app/core/prompts.py`:

- `DYNAMIC_FILTER_SYSTEM_PROMPT` — adapta una rutina existente según dolor y energía.
- `WEEKLY_PLAN_SYSTEM_PROMPT` — genera un plan de 7 días completo con periodización.

---

## 7. Frontend — Pantallas y Flujos

### OnboardingScreen

Pantalla de bienvenida. Ofrece acceso a Login y Registro. Sin lógica de datos.

### LoginScreen / RegisterScreen

Formularios con validación. Usan el hook `useAuth` para llamar a los endpoints `/auth/login` y `/auth/register`. Al autenticarse correctamente, el token JWT se guarda en `localStorage` y el usuario es redirigido al Dashboard.

### DashboardScreen

Pantalla principal. Al montar hace dos fetches en paralelo:

- `GET /history/weekly` → calcula racha de días, feel_value de la última sesión y músculos entrenados ayer (mapa de fatiga).
- `GET /history/chart` → calcula nivel y XP del usuario (100 XP por sesión, 500 XP por nivel).

El anillo de "Preparación diaria" se anima al valor real del feel_value con transición CSS. El mapa muscular muestra los grupos entrenados ayer en color ámbar (fatiga residual).

### PlannerScreen

Check-in diario con tres funciones:

1. **Carga automática**: al montar, llama a `/routines/adapt` con `feel_value=8` para obtener la rutina base del día sin invocar la IA.
2. **Navegación de días**: botones `‹` y `›` permiten cambiar entre días de la semana. El día seleccionado se pasa como `weekday` al endpoint.
3. **Adaptación IA**: al pulsar "Generar con IA", envía `feel_value`, `pain_zones` y `weekday` reales. La IA devuelve una rutina modificada con explicación.

Al aceptar, llama a `startSession(routine, feelVal, painZones)` del `WorkoutContext` y navega a WorkoutScreen.

### WorkoutScreen

Pantalla más compleja del proyecto. Maneja cuatro estados internos:

```
INTRO → WEIGHT_INPUT → ACTIVE → REST
```

- **INTRO**: el TTS lee el nombre del ejercicio. El usuario confirma con voz o botón.
- **WEIGHT_INPUT**: el usuario ingresa el peso en kg (teclado, botones ±, o voz). Los ejercicios de peso corporal saltan este estado.
- **ACTIVE**: la cámara se activa. MediaPipe analiza el esqueleto frame a frame. El analizador correspondiente cuenta reps y detecta errores posturales.
- **REST**: timer de 2 minutos con cuenta regresiva. Avisos de voz a los 10 y 5 segundos.

Al terminar la última serie del último ejercicio, llama a `POST /history/save` con todos los ejercicios acumulados.

### WeeklyScreen

Carga en cascada:

1. `GET /history/weekly` → obtiene sesiones reales de la semana.
2. `POST /routines/weekly-plan` → envía días ya entrenados, ejercicios realizados y feel_average a la IA para generar el plan completo.

Los días ya entrenados se marcan con un punto verde y muestran los ejercicios reales realizados. Los días planificados muestran el plan de la IA.

### HistoryScreen

Dos fetches en paralelo al montar. Calcula:

- **Semanas**: conteo de semanas únicas con al menos una sesión.
- **Progreso**: variación porcentual promedio entre el primer y último registro de peso de cada ejercicio.
- **Racha**: días consecutivos entrenados hacia atrás desde hoy.
- **Mapa muscular**: grupos musculares inferidos de los nombres de ejercicio en el historial.

El gráfico muestra el progreso de carga semanal del ejercicio seleccionado, con eje Y dinámico y etiquetas de fecha en el eje X.

---

## 8. Hooks Personalizados

### `useVoiceCommand.js`

Abstrae la Web Speech API para reconocimiento de voz continuo. Recibe un mapa de comandos `{ "keyword": () => action() }` y ejecuta la acción correspondiente cuando el transcript contiene la keyword.

```javascript
// Uso básico
const { isListening, listenForCommands, stopListening } = useVoiceCommand()

listenForCommands({
  'empezar': () => comenzarEjercicio(),
  'serie completada': () => handleSetCompletado(),
}, true) // true = modo continuo
```

**Características:**
- Configurado para `es-PE` (español peruano).
- Modo continuo: mantiene el micrófono abierto entre comandos.
- Limpieza automática al desmontar el componente (evita memory leaks).
- Solo una instancia activa a la vez — la nueva detiene la anterior.

### `useMediaPipe.js`

Gestiona el ciclo de vida completo de la cámara y el modelo MediaPipe Pose. Acepta un callback opcional `onLandmarks(landmarks)` que se invoca en cada frame con los 33 puntos del esqueleto detectados.

```javascript
const { videoRef, canvasRef, startCamera, stopCamera, isActive } = useMediaPipe()

// Activar con análisis postural
startCamera((landmarks) => analyzeFrame(landmarks))

// Activar solo con visualización del esqueleto
startCamera()
```

El modelo se considera "listo" al recibir el primer resultado válido. Hay un timeout de 4 segundos como seguro en caso de fallo de carga.

### `usePostureAnalysis.js`

Orquestador React que conecta los frames de MediaPipe con el analizador del ejercicio activo. Mantiene el estado de: fase de movimiento, conteo de reps, feedback postural y músculos activos.

```javascript
const {
  analyzeFrame,      // función que recibe landmarks
  repCount,          // reps totales detectadas
  repsBySide,        // { left, right, activeSide } para ejercicios unilaterales
  feedback,          // { type: 'error'|'success', message, id }
  activeMuscles,     // slugs de músculos para el mapa SVG
  muscleView,        // 'frontal' | 'espalda'
  angle,             // ángulo articular actual en grados
  reset,
  soportaAnalisis,   // true si el ejercicio tiene analizador registrado
} = usePostureAnalysis({ exercise: 'sentadilla' })
```

### `useAuth.js`

Expone `loginUser()` y `registerUser()` que llaman a los endpoints públicos de auth. Al recibir respuesta exitosa, llaman a `login(userData, token)` del `AuthContext` para persistir la sesión.

---

## 9. Contextos Globales

### `AuthContext.jsx`

Gestiona el estado de autenticación de forma persistente. Al montar, valida el token guardado en `localStorage` con `GET /auth/me`. Si el token expiró o es inválido, lo elimina automáticamente.

Expone `authFetch(path, options)`: un wrapper de `fetch` que añade el header `Authorization: Bearer <token>` automáticamente. Todas las pantallas usan `authFetch` en lugar de `fetch` directo.

```javascript
const { authFetch, user, isAuthenticated, logout } = useAuth()

// Equivalente a fetch con token automático
const res = await authFetch('/history/weekly')
```

### `WorkoutContext.jsx`

Comparte la rutina activa entre `PlannerScreen` y `WorkoutScreen` sin prop drilling. También transporta `feelValue` y `painZones` del check-in para que se guarden correctamente en el historial.

```javascript
// En PlannerScreen
startSession(routine, feelVal, [...painZones])

// En WorkoutScreen
const { routine, feelValue, painZones } = useWorkout()
```

---

## 10. Visión Computacional

### Arquitectura modular

Cada ejercicio es un módulo independiente con una función pura que recibe landmarks y un tracker de estado, y devuelve métricas del frame actual.

```
usePostureAnalysis (orquestador React)
    └── exercises/index.js (registro central)
            ├── squatAnalyzer.js
            ├── benchPressAnalyzer.js
            ├── shoulderLateralAnalyzer.js
            └── rowAnalyzer.js
```

### Funciones utilitarias (`poseUtils.js`)

Funciones puras de geometría sin estado ni React:

- `calcularAngulo(a, b, c)` — ángulo en grados en el vértice B formado por A-B-C.
- `visible(landmark)` — true si el landmark supera el umbral de confianza (0.5).
- `promedioPuntos(p1, p2)` — punto medio entre dos landmarks.
- `promedioAngulos(arr)` — promedio de ángulos descartando nulos.
- `inclinacionRespectoVertical(p1, p2)` — inclinación en grados respecto al eje Y.
- `crearRepTracker()` — crea el objeto de estado para una serie.

### Analizadores de ejercicio

Todos siguen la misma firma:

```javascript
function analyzeEjercicio(landmarks, tracker, config) {
  // Retorna:
  return {
    angle,          // ángulo articular principal (grados)
    errors,         // [{ code, message }] errores detectados en este frame
    repCompleted,   // true si se completó una repetición
    repWasClean,    // true si la rep no tuvo errores
    phase,          // fase actual del movimiento
  }
}
```

**Errores detectados por ejercicio:**

| Ejercicio | Errores |
|---|---|
| Sentadilla | Valgo de rodilla, espalda inclinada, profundidad insuficiente |
| Hombros laterales | Asimetría entre brazos, exceso de altura (trapecio) |
| Press de banca | Rango incompleto, asimetría |
| Remo unilateral | Rango incompleto, balanceo del torso |

### Remo unilateral — detección de brazo activo

El remo es el único ejercicio unilateral del sistema. Detecta automáticamente qué brazo está trabajando calculando la varianza del ángulo en una ventana deslizante de 6 frames. El brazo con mayor varianza es el activo. Los contadores de reps son independientes por lado.

### Cómo agregar un nuevo ejercicio

1. Crear `src/hooks/exercises/miEjercicioAnalyzer.js` siguiendo el patrón de los existentes.
2. Registrarlo en `src/hooks/exercises/index.js`:
```javascript
import { analyzeMiEjercicio, MI_EJERCICIO_CONFIG } from './miEjercicioAnalyzer'

export const EXERCISE_REGISTRY = {
  // ... ejercicios existentes
  mi_ejercicio: {
    analyze: analyzeMiEjercicio,
    config: MI_EJERCICIO_CONFIG,
  },
}
```
3. Agregar el mapeo de nombre en `WorkoutScreen.jsx`:
```javascript
const EXERCISE_NAME_MAP = [
  // ... mapeos existentes
  { keywords: ['mi ejercicio', 'variante'], exercise: 'mi_ejercicio' },
]
```

No hay que tocar `usePostureAnalysis.js` ni ningún otro archivo.

---

## 11. Sistema de Voz

La aplicación es **Hands-Free por diseño** — el usuario puede completar una sesión completa sin tocar la pantalla.

### Text-to-Speech (TTS)

Usa la Web Speech API nativa del navegador (`window.speechSynthesis`). Configurado en `es-PE` con velocidad 0.98.

Hay dos funciones de síntesis con comportamientos distintos:

- `speak(text, onComplete)` — cancela el reconocimiento activo mientras habla, luego lo reactiva. Usada para anuncios importantes (inicio de serie, descanso, fin de rutina).
- `speakBrief(text)` — no cancela el reconocimiento. Usada para feedback postural en tiempo real sin interrumpir el flujo.

### Speech-to-Text (STT)

El hook `useVoiceCommand` encapsula el `SpeechRecognition` de la Web Speech API. Cada pantalla declara su propio mapa de comandos y lo pasa al hook.

**Mapa de comandos de WorkoutScreen:**

| Estado | Comando | Acción |
|---|---|---|
| INTRO | "empezar", "listo" | Ir a WEIGHT_INPUT |
| WEIGHT_INPUT | \<número\> | Actualiza el peso |
| WEIGHT_INPUT | "confirmar" | Confirma el peso e inicia |
| ACTIVE | "serie completada", "terminado" | Finaliza la serie |
| REST | "saltar descanso" | Salta el timer |
| REST | "más tiempo", "menos tiempo" | Ajusta el timer ±30s |
| Todas | "volver", "salir" | Navega atrás |

**Parser de números en español** (en WorkoutScreen): convierte frases como "setenta y cinco kilos" → `75` usando un diccionario de palabras numéricas.

---

## 12. Flujo Completo de Datos

```
Usuario abre la app
    │
    ▼
AuthContext valida token en localStorage
    │── Token válido → Dashboard
    └── Sin token → Login/Registro
                        │
                        ▼
                    POST /auth/login
                    JWT guardado en localStorage
                        │
                        ▼
                    Dashboard (fetch paralelo)
                    ├── GET /history/weekly → racha, fatiga
                    └── GET /history/chart  → nivel, XP
                        │
                        ▼
                    PlannerScreen (check-in)
                    ├── POST /routines/adapt (feel=8) → rutina base del día
                    ├── [opcional] POST /routines/adapt (feel real + dolor) → IA adapta
                    └── startSession(routine, feel, painZones) → WorkoutContext
                        │
                        ▼
                    WorkoutScreen
                    ├── INTRO → WEIGHT_INPUT → ACTIVE → REST (× series)
                    ├── MediaPipe analiza postura frame a frame
                    ├── usePostureAnalysis cuenta reps y detecta errores
                    └── Al terminar: POST /history/save
                                    { feel_value, pain_zones, exercises[] }
                        │
                        ▼
                    Dashboard / History / Weekly
                    muestran los datos recién guardados
```

---

## 13. API Reference

Todos los endpoints excepto `/auth/register`, `/auth/login` y `GET /` requieren el header:
```
Authorization: Bearer <jwt_token>
```

### Auth

#### `POST /api/v1/auth/register`
```json
// Request
{ "email": "user@email.com", "full_name": "Nombre", "password": "pass123" }

// Response 200
{ "status": "success", "token": "<jwt>", "usuario": { "id": 1, "email": "...", ... } }
```

#### `POST /api/v1/auth/login`
```json
// Request
{ "email": "user@email.com", "password": "pass123" }

// Response 200
{ "status": "success", "token": "<jwt>", "usuario": { ... } }
```

#### `GET /api/v1/auth/me`
```json
// Response 200
{ "id": 1, "email": "user@email.com", "full_name": "Nombre", "is_active": true, ... }
```

### Routines

#### `POST /api/v1/routines/adapt`
```json
// Request
{ "feel_value": 7, "pain_zones": ["deltoids"], "weekday": 2 }

// Response 200
{
  "exercises": [
    { "name": "Sentadilla con barra", "sets_description": "4 × 8–10 reps · 80 kg", "is_modified": false }
  ],
  "ai_feedback": "Rutina de piernas lista. Sin zonas de dolor reportadas.",
  "day_label": "Piernas y Glúteos"
}
```

#### `POST /api/v1/routines/weekly-plan`
```json
// Request
{ "trained_weekdays": [0, 2], "trained_exercises": ["Press banca"], "feel_average": 7.5, "goal": "hipertrofia" }

// Response 200
{
  "days": [
    { "weekday": 0, "label": "Pecho", "sub": "Tríceps", "group": "Pecho / Tríceps", "exercises": "Press banca · Fondos", "isRest": false },
    { "weekday": 6, "label": "Descanso", "sub": "Recovery", "group": null, "exercises": null, "isRest": true }
  ],
  "ai_feedback": "Plan generado respetando tu historial de esta semana."
}
```

### History

#### `POST /api/v1/history/save`
```json
// Request
{
  "feel_value": 8,
  "pain_zones": [],
  "ai_feedback_log": null,
  "exercises": [
    { "exercise_name": "Press de banca", "sets_completed": 4, "reps_completed": 10, "weight_kg": 75.0 }
  ]
}

// Response 200
{ "message": "¡Entrenamiento registrado con éxito!" }
```

#### `GET /api/v1/history/chart`
```json
// Response 200
{
  "exercises": ["Press de banca", "Sentadilla con barra"],
  "history": {
    "Press de banca": [
      { "date": "2025-01-15T10:00:00Z", "weight_kg": 70.0 },
      { "date": "2025-01-22T10:00:00Z", "weight_kg": 75.0 }
    ]
  }
}
```

#### `GET /api/v1/history/weekly`
```json
// Response 200
[
  { "date": "2025-01-20", "weekday": 0, "feel_value": 8, "exercises": ["Press de banca", "Fondos"] },
  { "date": "2025-01-22", "weekday": 2, "feel_value": 6, "exercises": ["Sentadilla con barra"] }
]
```

---

## 14. Modelos de Datos

### Base de datos (SQLite)

```
User
├── id (PK)
├── email (unique, indexed)
├── full_name
├── hashed_password
├── is_active
└── created_at

WorkoutSession
├── id (PK)
├── user_id (FK → User, indexed)
├── date
├── feel_value (1-10)
├── pain_zones_json (JSON string)
└── ai_feedback_log

ExerciseLog
├── id (PK)
├── session_id (FK → WorkoutSession)
├── exercise_name
├── sets_completed
├── reps_completed
└── weight_kg
```

### Relaciones

```
User 1 ──── N WorkoutSession
WorkoutSession 1 ──── N ExerciseLog
```

---

## 15. Decisiones de Diseño

### MediaPipe legacy vs tasks-vision
Se mantiene `@mediapipe/pose` (versión legacy) en lugar de migrar a `@mediapipe/tasks-vision` para el MVP. La razón es estabilidad: la versión legacy ya funciona en el proyecto y una migración introduciría riesgos sin beneficio claro para esta etapa.

### Analizadores como funciones puras
Cada analizador de ejercicio es una función pura sin estado React ni efectos secundarios. El estado del tracker vive en un `useRef` dentro de `usePostureAnalysis`. Esto permite testear cada analizador de forma aislada pasándole landmarks sintéticos.

### Máquina de estados por inflexión real
El conteo de repeticiones no usa un umbral fijo ("si el ángulo baja de X, cuenta una rep"). En cambio, detecta inflexiones reales: el ángulo debe bajar hasta un mínimo y luego subir de forma confirmada (con histéresis) para contar la rep. Esto lo hace robusto ante variaciones de profundidad entre personas.

### authFetch centralizado
En lugar de duplicar el header `Authorization` en cada `fetch`, el `AuthContext` expone `authFetch()` que lo agrega automáticamente. Si el token cambia (re-login), todas las pantallas usan el nuevo token sin modificaciones.

### Lógica de eficiencia en el Planner
Si el usuario reporta energía ≥ 7 y ninguna zona de dolor, el backend devuelve la rutina base sin llamar a la IA. Esto reduce el consumo de tokens de Groq en los casos más comunes (usuario en buen estado).

### feel_value y pain_zones en WorkoutContext
Estos datos del check-in se propagan desde `PlannerScreen` a `WorkoutScreen` a través del contexto. De esta forma, cuando se guarda el historial al finalizar el entrenamiento, el registro incluye el estado real del usuario en ese día, no un valor genérico.

### Filosofía Hands-Free
Toda la aplicación está diseñada para usarse sin tocar la pantalla. Cada estado de `WorkoutScreen` tiene comandos de voz equivalentes a todos los botones táctiles. La síntesis de voz anuncia cada transición de estado, el fin de series y el feedback postural.
