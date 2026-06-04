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
        description="Mensaje en lenguaje natural del LLM explicando la adaptación de la rutina"
    )