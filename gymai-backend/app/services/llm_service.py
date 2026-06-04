import google.generativeai as genai
import base64
from app.models.scan import ScanResponse
from fastapi import HTTPException
import json
from app.core.config import settings
from app.models.routine import RoutineResponse

API_KEY = settings.GEMINI_API_KEY

if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("No se encontró GEMINI_API_KEY en las variables de entorno.")

async def generate_routine_adaptation(system_prompt: str, user_data: str) -> dict:
    """
    Toma las instrucciones, el estado del usuario, y obliga a Gemini 
    a devolver un JSON que cumpla estrictamente con el esquema RoutineResponse.
    """
    if not API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="El servidor no tiene configurada la API Key de Gemini."
        )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt
        )

        response = model.generate_content(
            user_data,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2, 
                # Forzamos que sea JSON
                response_mime_type="application/json"
            )
        )

        # Retornamos el diccionario parseado
        return json.loads(response.text)

    except Exception as e:
        print(f"[LLM Error Detallado]: {str(e)}") # Para ver el error exacto en tu consola
        raise HTTPException(status_code=500, detail="Error al comunicarse con el motor de IA.")

async def analyze_equipment_image(base64_string: str) -> dict:
    """
    Envía un frame de la cámara a Gemini para identificar equipamiento deportivo.
    """
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Falta API Key")

    try:
        # Limpiar el string base64 si viene con el prefijo de Data URI de HTML
        if "base64," in base64_string:
            base64_string = base64_string.split("base64,")[1]

        image_bytes = base64.b64decode(base64_string)

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="""
            You are an expert computer vision AI for a fitness app.
            Analyze the provided image and identify any gym equipment (e.g., dumbbells, barbell, bench, yoga mat).
            Ignore people, furniture, or irrelevant objects.
            
            Respond STRICTLY in JSON format matching exactly this schema:
            {
                "detected_items": [
                    {"name": "Equipment name in Spanish", "is_usable": true}
                ],
                "scan_message": "A brief, encouraging message in Spanish about what you found."
            }
            """
        )

        response = model.generate_content(
            [
                {"mime_type": "image/jpeg", "data": image_bytes},
                "¿Qué equipamiento deportivo ves en esta imagen?"
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        return json.loads(response.text)

    except Exception as e:
        print(f"[Vision LLM Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="Error analizando el entorno visual.")