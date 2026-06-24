import traceback
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session

from app.core.db import get_session
from app.api.auth.router import get_current_user
from app.models.user import UserPublic
from app.models.routine import (
    CheckInRequest, RoutineResponse,
    WeeklyPlanRequest, WeeklyPlanResponse,
)
from app.api.routines.service import RoutineService
from app.api.routines.repository import RoutineRepository

router = APIRouter(prefix="/routines", tags=["Routines"])


@router.post("/adapt", response_model=RoutineResponse)
async def adapt_daily_routine(
    checkin_data: CheckInRequest,
    db: Session = Depends(get_session),
    current_user: UserPublic = Depends(get_current_user),
):
    """Recibe el check-in diario y adapta la rutina con IA."""
    service = RoutineService(RoutineRepository(db))
    try:
        adapted_routine = await service.process_daily_checkin(
            checkin_data, user_id=current_user.id
        )
        return adapted_routine
    except Exception as e:
        print("\n" + "=" * 50)
        print("ERROR REAL CAPTURADO:")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise HTTPException(status_code=500, detail="Error interno al generar la rutina adaptada.")


@router.post("/weekly-plan", response_model=WeeklyPlanResponse)
async def generate_weekly_plan(
    request: WeeklyPlanRequest,
    db: Session = Depends(get_session),
    current_user: UserPublic = Depends(get_current_user),
):
    """Genera un plan semanal de 7 días con IA para el usuario autenticado."""
    service = RoutineService(RoutineRepository(db))
    try:
        weekly_plan = await service.generate_weekly_plan(request)
        return weekly_plan
    except Exception as e:
        print("\n" + "=" * 50)
        print("ERROR EN /weekly-plan:")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise HTTPException(status_code=500, detail="Error interno al generar el plan semanal.")