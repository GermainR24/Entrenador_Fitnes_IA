from sqlmodel import SQLModel, Field, Relationship
from typing import Dict, List, Optional
from datetime import datetime, timezone
import json

# ─── DB MODELS (table=True) ───────────────────────────────────────────────────

class WorkoutSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    feel_value: int
    pain_zones_json: str = Field(default="[]")
    ai_feedback_log: Optional[str] = Field(default=None)

    # Relación 1 a N
    exercises: List["ExerciseLog"] = Relationship(back_populates="session")


class ExerciseLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="workoutsession.id")

    exercise_name: str
    sets_completed: int
    reps_completed: int
    weight_kg: float

    session: Optional[WorkoutSession] = Relationship(back_populates="exercises")


# ─── API SCHEMAS ──────────────────────────────────────────────────────────────

class ExerciseLogCreate(SQLModel):
    exercise_name: str = Field(description="Nombre del ejercicio")
    sets_completed: int = Field(ge=0)
    reps_completed: int = Field(ge=0)
    weight_kg: float = Field(ge=0.0)


class WorkoutSaveRequest(SQLModel):
    feel_value: int = Field(ge=1, le=10)
    pain_zones: List[str] = Field(default=[])
    ai_feedback_log: Optional[str] = Field(default=None)
    exercises: List[ExerciseLogCreate]


class ChartDataPoint(SQLModel):
    date: datetime
    weight_kg: float


class HistoryChartResponse(SQLModel):
    exercises: List[str] = Field(description="Lista de nombres de ejercicios únicos")
    history: Dict[str, List[ChartDataPoint]] = Field(
        description="Diccionario donde la llave es el ejercicio y el valor es su historial"
    )


class WeeklySessionResponse(SQLModel):
    """
    Resumen de una sesión de entrenamiento para la vista semanal.
    El frontend lo usa para marcar días entrenados y mostrar qué se hizo.
    """
    date: str = Field(description="Fecha ISO, ej: '2025-01-20'")
    weekday: int = Field(description="0=lunes, 1=martes, …, 6=domingo")
    feel_value: int = Field(description="Energía reportada ese día (1-10)")
    exercises: List[str] = Field(description="Nombres de los ejercicios completados")