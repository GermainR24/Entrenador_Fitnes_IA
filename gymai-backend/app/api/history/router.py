from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.db import get_session 
from app.models.history import WorkoutSaveRequest
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