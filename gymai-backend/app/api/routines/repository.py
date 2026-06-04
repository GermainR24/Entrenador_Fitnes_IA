from sqlmodel import Session
from typing import List
from app.models.routine import ExerciseItem

class RoutineRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_base_routine(self, user_id: int) -> List[ExerciseItem]:
        """
        Consulta la base de datos para obtener la rutina planificada del día
        basada en el historial y la progresión matemática.
        """
        # TODO: Reemplazar con consulta real a la BD
        return [
            ExerciseItem(name="Press de banca", sets_description="4 × 8–10 reps · 75 kg"),
            ExerciseItem(name="Press inclinado mancuernas", sets_description="3 × 10–12 reps · 28 kg"),
            ExerciseItem(name="Fondos en paralelas", sets_description="3 × 12 reps · Peso corporal"),
            ExerciseItem(name="Press francés", sets_description="3 × 12 reps · 20 kg"),
            ExerciseItem(name="Extensiones polea alta", sets_description="3 × 15 reps · 15 kg")
        ]