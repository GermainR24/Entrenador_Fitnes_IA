from typing import DefaultDict
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.core.db import get_session
from app.api.auth.router import get_current_user
from app.models.user import UserPublic
from app.models.history import (
    ChartDataPoint,
    HistoryChartResponse,
    WorkoutSaveRequest,
    WeeklySessionResponse,
)
from app.api.history.repository import HistoryRepository

router = APIRouter(prefix="/history", tags=["History"])


@router.post("/save")
def save_completed_workout(
    workout_data: WorkoutSaveRequest,
    db: Session = Depends(get_session),
    current_user: UserPublic = Depends(get_current_user),
):
    """Guarda el resumen de la sesión del usuario autenticado."""
    try:
        repo = HistoryRepository(session=db)
        repo.save_workout_session(user_id=current_user.id, data=workout_data)
        return {"message": "¡Entrenamiento registrado con éxito!"}
    except Exception as e:
        print(f"[DB Error save]: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al guardar el historial.")


@router.get("/chart", response_model=HistoryChartResponse)
def get_history_chart_data(
    db: Session = Depends(get_session),
    current_user: UserPublic = Depends(get_current_user),
):
    """Devuelve el historial agrupado por ejercicio para graficar."""
    try:
        repo = HistoryRepository(session=db)
        raw_data = repo.get_user_exercise_history(user_id=current_user.id)

        history_dict = DefaultDict(list)
        unique_exercises = set()

        for exercise_name, weight_kg, date in raw_data:
            unique_exercises.add(exercise_name)
            history_dict[exercise_name].append(
                ChartDataPoint(date=date, weight_kg=weight_kg)
            )

        return HistoryChartResponse(
            exercises=list(unique_exercises),
            history=dict(history_dict),
        )
    except Exception as e:
        print(f"[DB Error chart]: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al generar los datos del gráfico.")


@router.get("/weekly", response_model=list[WeeklySessionResponse])
def get_weekly_sessions(
    db: Session = Depends(get_session),
    current_user: UserPublic = Depends(get_current_user),
):
    """Devuelve las sesiones de los últimos 7 días del usuario autenticado."""
    try:
        repo = HistoryRepository(session=db)
        return repo.get_weekly_sessions(user_id=current_user.id)
    except Exception as e:
        print(f"[DB Error weekly]: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al obtener el historial semanal.")