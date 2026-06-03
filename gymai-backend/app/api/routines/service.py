import json
from app.models.routine import CheckInRequest, RoutineResponse
from app.api.routines.repository import RoutineRepository
from app.core.prompts import DYNAMIC_FILTER_SYSTEM_PROMPT
from app.services.llm_service import generate_routine_adaptation 

class RoutineService:
    def __init__(self):
        self.repository = RoutineRepository()

    async def process_daily_checkin(self, checkin: CheckInRequest, user_id: int) -> RoutineResponse:
        base_routine = self.repository.get_base_routine(user_id)

        # Lógica de eficiencia
        if not checkin.pain_zones and checkin.feel_value >= 7:
            return RoutineResponse(
                exercises=base_routine,
                ai_feedback="¡Estás a tope! Vamos a darle con la rutina planificada para hoy."
            )

        # Preparamos el payload como texto para el LLM
        user_data = json.dumps({
            "feel_value": checkin.feel_value,
            "pain_zones": checkin.pain_zones,
            "base_routine": [ex.model_dump() for ex in base_routine]
        }, ensure_ascii=False)

        # Llamada real al servicio LLM (Ya no es un mock)
        llm_response_dict = await generate_routine_adaptation(
            system_prompt=DYNAMIC_FILTER_SYSTEM_PROMPT,
            user_data=user_data
        )

        # Validamos que el diccionario devuelto por Gemini cumpla con tu modelo
        return RoutineResponse(**llm_response_dict)