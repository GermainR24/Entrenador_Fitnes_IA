import json
from app.models.routine import (
    CheckInRequest,
    RoutineResponse,
    WeeklyPlanRequest,
    WeeklyPlanResponse,
    WeeklyDayPlan,
)
from app.api.routines.repository import RoutineRepository
from app.core.prompts import DYNAMIC_FILTER_SYSTEM_PROMPT, WEEKLY_PLAN_SYSTEM_PROMPT
from app.services.llm_service import generate_routine_adaptation


class RoutineService:
    def __init__(self, repository: RoutineRepository):
        self.repository = repository

    async def process_daily_checkin(self, checkin: CheckInRequest, user_id: int) -> RoutineResponse:
        base_routine = self.repository.get_base_routine(user_id)
        label        = self.repository.get_base_routine_label(user_id)

        # Sin dolor y con energía alta → devolver rutina base sin llamar a la IA
        if not checkin.pain_zones and checkin.feel_value >= 7:
            return RoutineResponse(
                exercises=base_routine,
                ai_feedback=f"¡Estás a tope! Vamos con {label} tal como está planificado.",
                day_label=label,
            )

        user_data = json.dumps({
            "feel_value": checkin.feel_value,
            "pain_zones": checkin.pain_zones,
            "base_routine": [ex.model_dump() for ex in base_routine]
        }, ensure_ascii=False)

        llm_response_dict = await generate_routine_adaptation(
            system_prompt=DYNAMIC_FILTER_SYSTEM_PROMPT,
            user_data=user_data
        )

        # Inyectamos el label del día en la respuesta
        llm_response_dict["day_label"] = label
        return RoutineResponse(**llm_response_dict)

    async def generate_weekly_plan(self, request: WeeklyPlanRequest) -> WeeklyPlanResponse:
        user_data = json.dumps({
            "trained_weekdays":  request.trained_weekdays,
            "trained_exercises": request.trained_exercises,
            "feel_average":      request.feel_average,
            "goal":              request.goal,
        }, ensure_ascii=False)

        llm_response_dict = await generate_routine_adaptation(
            system_prompt=WEEKLY_PLAN_SYSTEM_PROMPT,
            user_data=user_data
        )

        days_raw = llm_response_dict.get("days", [])
        weekdays_present = {d["weekday"] for d in days_raw}
        for wd in range(7):
            if wd not in weekdays_present:
                days_raw.append({
                    "weekday": wd, "label": "Descanso", "sub": "Recovery",
                    "group": None, "exercises": None, "isRest": True,
                })

        days_raw.sort(key=lambda d: d["weekday"])

        return WeeklyPlanResponse(
            days=[WeeklyDayPlan(**d) for d in days_raw],
            ai_feedback=llm_response_dict.get("ai_feedback", "Plan semanal generado.")
        )