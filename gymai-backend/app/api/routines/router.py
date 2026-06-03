import traceback

from requests import Session
from fastapi import APIRouter, HTTPException, Depends
from app.models.routine import CheckInRequest, RoutineResponse
from app.api.routines.service import RoutineService
from app.core.db import get_session
# from app.api.auth.service import get_current_user  # Autenticación

router = APIRouter(prefix="/routines", tags=["Routines"])

@router.post("/adapt", response_model=RoutineResponse)
async def adapt_daily_routine(
    checkin_data: CheckInRequest,
    db: Session = Depends(get_session)
    # current_user: User = Depends(get_current_user)
):
    """
    Recibe el check-in diario y regenera la rutina si es necesario.
    """
    service = RoutineService(db=db)
    try:
        # Delegamos toda la lógica compleja al Service
        adapted_routine = await service.process_daily_checkin(checkin_data, user_id=1)
        return adapted_routine
    except Exception as e:
        print("\n" + "="*50)
        print(f"ERROR REAL CAPTURADO:")
        traceback.print_exc()
        print("="*50 + "\n")
        raise HTTPException(
            status_code=500, 
            detail="Error interno al generar la rutina adaptada."
        )
