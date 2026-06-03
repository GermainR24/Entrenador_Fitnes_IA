from sqlmodel import Session
from app.models.history import WorkoutSession, ExerciseLog, WorkoutSaveRequest
import json

class HistoryRepository:
    def __init__(self, session: Session):
        self.session = session

    def save_workout_session(self, user_id: int, data: WorkoutSaveRequest) -> WorkoutSession:
        # 1. Crear la instancia de la sesión padre
        db_session = WorkoutSession(
            user_id=user_id,
            feel_value=data.feel_value,
            pain_zones_json=json.dumps(data.pain_zones),
            ai_feedback_log=data.ai_feedback_log
        )
        
        # 2. Agregar los registros de los ejercicios (hijos)
        db_session.exercises = [
            ExerciseLog(
                exercise_name=ex.exercise_name,
                sets_completed=ex.sets_completed,
                reps_completed=ex.reps_completed,
                weight_kg=ex.weight_kg
            )
            for ex in data.exercises
        ]
        
        # 3. Guardar en la base de datos de forma atómica
        self.session.add(db_session)
        self.session.commit()
        self.session.refresh(db_session)
        
        return db_session