from sqlmodel import Session, select
from app.models.history import WorkoutSession, ExerciseLog, WorkoutSaveRequest
from datetime import datetime, timezone, timedelta
import json

class HistoryRepository:
    def __init__(self, session: Session):
        self.session = session

    def save_workout_session(self, user_id: int, data: WorkoutSaveRequest) -> WorkoutSession:
        db_session = WorkoutSession(
            user_id=user_id,
            feel_value=data.feel_value,
            pain_zones_json=json.dumps(data.pain_zones),
            ai_feedback_log=data.ai_feedback_log
        )
        db_session.exercises = [
            ExerciseLog(
                exercise_name=ex.exercise_name,
                sets_completed=ex.sets_completed,
                reps_completed=ex.reps_completed,
                weight_kg=ex.weight_kg
            )
            for ex in data.exercises
        ]
        self.session.add(db_session)
        self.session.commit()
        self.session.refresh(db_session)
        return db_session

    def get_user_exercise_history(self, user_id: int):
        statement = (
            select(
                ExerciseLog.exercise_name,
                ExerciseLog.weight_kg,
                WorkoutSession.date
            )
            .join(WorkoutSession)
            .where(WorkoutSession.user_id == user_id)
            .order_by(WorkoutSession.date.asc())
        )
        results = self.session.exec(statement).all()
        return results

    def get_weekly_sessions(self, user_id: int) -> list[dict]:
        """
        Devuelve las sesiones de entrenamiento de los últimos 7 días,
        con los ejercicios registrados en cada una.

        Retorna una lista de dicts:
        [
          {
            "date": "2025-01-20",          # ISO date (solo fecha, sin hora)
            "weekday": 0,                  # 0=lunes … 6=domingo (Python isoweekday - 1)
            "feel_value": 8,
            "exercises": ["Press banca", "Fondos"]
          },
          ...
        ]
        """
        # Límite: 7 días hacia atrás desde hoy (timezone-aware)
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=7)

        sessions_stmt = (
            select(WorkoutSession)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.date >= week_start
            )
            .order_by(WorkoutSession.date.asc())
        )
        sessions = self.session.exec(sessions_stmt).all()

        result = []
        for ws in sessions:
            # Cargar ejercicios de esta sesión
            exercises_stmt = (
                select(ExerciseLog.exercise_name)
                .where(ExerciseLog.session_id == ws.id)
            )
            exercise_names = self.session.exec(exercises_stmt).all()

            # Normalizar la fecha a timezone-aware antes de operar
            session_date = ws.date
            if session_date.tzinfo is None:
                session_date = session_date.replace(tzinfo=timezone.utc)

            result.append({
                "date": session_date.date().isoformat(),
                # isoweekday(): 1=lun…7=dom → restamos 1 para tener 0=lun…6=dom
                "weekday": session_date.isoweekday() - 1,
                "feel_value": ws.feel_value,
                "exercises": list(exercise_names),
            })

        return result