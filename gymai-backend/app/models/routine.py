from typing import List, Optional
from sqlmodel import SQLModel, Field

# --- Modelos base para los ejercicios ---

class ExerciseItem(SQLModel):
    name: str = Field(
        description="Nombre del ejercicio (ej. Press de banca)"
    )
    sets_description: str = Field(
        description="Series, repeticiones y carga (ej. 4 × 8–10 reps · 75 kg)"
    )
    is_modified: bool = Field(
        default=False, 
        description="Bandera que indica al frontend si la IA modificó este ejercicio específico"
    )

# --- Modelo para recibir los datos de React (Frontend -> Backend) ---

class CheckInRequest(SQLModel):
    feel_value: int = Field(
        ge=1, 
        le=10, 
        description="Nivel de energía reportado (1 = Agotado, 10 = Con energía)"
    )
    pain_zones: List[str] = Field(
        default=[], 
        description="Lista de IDs de músculos con molestia (ej. ['pectoral', 'shoulder_right'])"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "feel_value": 7,
                "pain_zones": ["shoulder_right", "elbow_left"]
            }
        }
    }

# --- Modelo para devolver la rutina adaptada (Backend -> Frontend) ---

class RoutineResponse(SQLModel):
    exercises: List[ExerciseItem]
    ai_feedback: Optional[str] = Field(
        default=None,
        description="Mensaje en lenguaje natural del LLM explicando la adaptación"
    )
    day_label: Optional[str] = Field(
        default=None,
        description="Nombre del grupo muscular del día, ej: 'Espalda y Bíceps'"
    )

# ─── Schemas para el plan semanal (WeeklyScreen) ──────────────────────────────

class WeeklyPlanRequest(SQLModel):
    """
    Payload que WeeklyScreen envía al endpoint POST /routines/weekly-plan.
    El frontend calcula estos valores a partir de GET /history/weekly.
    """
    trained_weekdays: List[int] = Field(
        default=[],
        description="Días ya entrenados esta semana: 0=lun … 6=dom"
    )
    trained_exercises: List[str] = Field(
        default=[],
        description="Ejercicios ya realizados esta semana (nombres tal como se guardaron)"
    )
    feel_average: Optional[float] = Field(
        default=None,
        description="Promedio de feel_value de las sesiones de esta semana"
    )
    goal: str = Field(
        default="hipertrofia",
        description="Objetivo principal: fuerza | hipertrofia | resistencia | general"
    )


class WeeklyDayPlan(SQLModel):
    """Un día del plan semanal generado por la IA."""
    weekday: int = Field(description="0=lunes … 6=domingo")
    label: str = Field(description="Etiqueta corta, ej: 'Pecho'")
    sub: str = Field(description="Subtítulo, ej: 'Tríceps'")
    group: Optional[str] = Field(default=None, description="Ej: 'Pecho / Tríceps'")
    exercises: Optional[str] = Field(default=None, description="Ejercicios separados por ·")
    isRest: bool = Field(default=False)


class WeeklyPlanResponse(SQLModel):
    """Respuesta completa del endpoint POST /routines/weekly-plan."""
    days: List[WeeklyDayPlan] = Field(description="Siempre 7 elementos (lun-dom)")
    ai_feedback: str = Field(description="Explicación del plan en español")