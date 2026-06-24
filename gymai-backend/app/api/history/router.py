from typing import DefaultDict
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.db import get_session 
from app.models.history import ChartDataPoint, HistoryChartResponse, WorkoutSaveRequest
from app.api.history.repository import HistoryRepository

router = APIRouter(prefix="/history", tags=["History"])

@router.post("/save")
def save_completed_workout(
    workout_data: WorkoutSaveRequest,
    db: Session = Depends(get_session),
    # current_user: User = Depends(get_current_user)
):
    """
    Guarda el resumen exacto de lo que el usuario levantó durante su sesión.
    """
    try:
        repo = HistoryRepository(session=db)
        saved_session = repo.save_workout_session(user_id=1, data=workout_data)
        
        return {"message": "¡Entrenamiento registrado con éxito! Tus estadísticas han sido actualizadas."}
    except Exception as e:
        # Registro técnico de logs
        print(f"[DB Error]: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Error al guardar el historial de entrenamiento en la base de datos."
        )
   
@router.get("/chart", response_model=HistoryChartResponse)
def get_history_chart_data(
    db: Session = Depends(get_session),
    # current_user: User = Depends(get_current_user)
):
    """
    Devuelve los datos del historial agrupados por ejercicio para graficar en React.
    """
    try:
        repo = HistoryRepository(session=db)
        
        # Para el MVP, hardcodeamos el user_id=1. Luego vendrá del current_user
        raw_data = repo.get_user_exercise_history(user_id=1)
        
        # Agrupamos los datos usando lógica pura de Python
        history_dict = DefaultDict(list)
        unique_exercises = set()

        for exercise_name, weight_kg, date in raw_data:
            unique_exercises.add(exercise_name)
            history_dict[exercise_name].append(
                ChartDataPoint(date=date, weight_kg=weight_kg)
            )

        # Retornamos cumpliendo el contrato estricto
        return HistoryChartResponse(
            exercises=list(unique_exercises),
            history=dict(history_dict)
        )
        
    except Exception as e:
        print("\n" + "="*50)
        print("💥 ERROR EN EXTRACCIÓN DE HISTORIAL:")
        import traceback
        traceback.print_exc()
        print("="*50 + "\n")
        
        raise HTTPException(
            status_code=500, 
            detail="Error interno al generar los datos del gráfico."
        )