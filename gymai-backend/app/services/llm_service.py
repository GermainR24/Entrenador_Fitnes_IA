
import json
import base64
from groq import Groq
from fastapi import HTTPException
from app.core.config import settings

# ─── Cliente Groq ─────────────────────────────────────────────────────────────
_groq_client = None

def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        if not settings.GROQ_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="El servidor no tiene configurada la API Key de Groq."
            )
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


# ─── Función principal: genera adaptación de rutina o plan semanal ────────────

async def generate_routine_adaptation(system_prompt: str, user_data: str) -> dict:
    """
    Recibe un system_prompt y datos del usuario, devuelve un dict JSON.
    Misma firma que la versión de Gemini — el resto del proyecto no cambia.
    """
    try:
        client = get_groq_client()

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_data},
            ],
            temperature=0.2,
            max_tokens=2048,
            response_format={"type": "json_object"},  # Fuerza respuesta JSON
        )

        response_text = completion.choices[0].message.content
        return json.loads(response_text)

    except json.JSONDecodeError as e:
        print(f"[Groq JSON Error]: No se pudo parsear la respuesta: {e}")
        raise HTTPException(
            status_code=500,
            detail="La IA devolvió una respuesta inválida."
        )
    except Exception as e:
        print(f"[Groq Error]: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al comunicarse con el motor de IA."
        )


# ─── Análisis de imagen (ScanScreen) — se mantiene con Gemini ─────────────────
# Groq no soporta visión por imagen en el tier gratuito.
# Si no usas ScanScreen, puedes ignorar esta función.

async def analyze_equipment_image(base64_string: str) -> dict:
    """
    Analiza una imagen de equipamiento deportivo.
    Mantiene Gemini para visión — Groq free tier no soporta imágenes.
    Si GEMINI_API_KEY no está configurada, devuelve respuesta mock.
    """
    if not settings.GEMINI_API_KEY:
        # Fallback mock si no hay Gemini configurado
        return {
            "detected_items": [
                {"name": "Mancuernas", "is_usable": True}
            ],
            "scan_message": "Escáner no disponible. Configura GEMINI_API_KEY para activarlo."
        }

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)

        if "base64," in base64_string:
            base64_string = base64_string.split("base64,")[1]
        image_bytes = base64.b64decode(base64_string)

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="""
            You are an expert computer vision AI for a fitness app.
            Analyze the provided image and identify any gym equipment.
            Respond STRICTLY in JSON format:
            {
                "detected_items": [
                    {"name": "Equipment name in Spanish", "is_usable": true}
                ],
                "scan_message": "A brief encouraging message in Spanish."
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
        print(f"[Vision Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="Error analizando el entorno visual.")