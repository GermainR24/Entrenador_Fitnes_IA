from sqlmodel import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.models.routine import ExerciseItem

# ─── Split semanal: 0=lunes … 6=domingo ──────────────────────────────────────
WEEKLY_SPLIT = {
    0: {
        "label": "Pecho y Tríceps",
        "exercises": [
            ExerciseItem(name="Press de banca",             sets_description="4 × 8–10 reps · 75 kg"),
            ExerciseItem(name="Press inclinado mancuernas", sets_description="3 × 10–12 reps · 28 kg"),
            ExerciseItem(name="Fondos en paralelas",        sets_description="3 × 12 reps · Peso corporal"),
            ExerciseItem(name="Press francés",              sets_description="3 × 12 reps · 20 kg"),
            ExerciseItem(name="Extensiones polea alta",     sets_description="3 × 15 reps · 15 kg"),
        ]
    },
    1: {
        "label": "Espalda y Bíceps",
        "exercises": [
            ExerciseItem(name="Remo con mancuerna",         sets_description="4 × 10–12 reps · 30 kg"),
            ExerciseItem(name="Dominadas asistidas",        sets_description="3 × 8–10 reps · Peso corporal"),
            ExerciseItem(name="Remo en polea baja",         sets_description="3 × 12 reps · 50 kg"),
            ExerciseItem(name="Curl de bíceps mancuernas",  sets_description="3 × 12 reps · 14 kg"),
            ExerciseItem(name="Curl martillo",              sets_description="3 × 12 reps · 12 kg"),
        ]
    },
    2: {
        "label": "Piernas y Glúteos",
        "exercises": [
            ExerciseItem(name="Sentadilla con barra",       sets_description="4 × 8–10 reps · 80 kg"),
            ExerciseItem(name="Prensa de piernas",          sets_description="3 × 12 reps · 120 kg"),
            ExerciseItem(name="Zancadas con mancuernas",    sets_description="3 × 12 reps · 20 kg"),
            ExerciseItem(name="Peso muerto rumano",         sets_description="3 × 10 reps · 60 kg"),
            ExerciseItem(name="Elevación de talones",       sets_description="4 × 15 reps · Peso corporal"),
        ]
    },
    3: {
        "label": "Hombros y Trapecios",
        "exercises": [
            ExerciseItem(name="Press militar mancuernas",   sets_description="4 × 8–10 reps · 22 kg"),
            ExerciseItem(name="Elevaciones laterales",      sets_description="4 × 12–15 reps · 10 kg"),
            ExerciseItem(name="Elevaciones frontales",      sets_description="3 × 12 reps · 8 kg"),
            ExerciseItem(name="Pájaros con mancuernas",     sets_description="3 × 15 reps · 8 kg"),
            ExerciseItem(name="Encogimientos de hombros",   sets_description="3 × 15 reps · 30 kg"),
        ]
    },
    4: {
        "label": "Pecho y Tríceps",
        "exercises": [
            ExerciseItem(name="Press de banca inclinado",   sets_description="4 × 8–10 reps · 65 kg"),
            ExerciseItem(name="Aperturas con mancuernas",   sets_description="3 × 12 reps · 18 kg"),
            ExerciseItem(name="Pullover con mancuerna",     sets_description="3 × 12 reps · 22 kg"),
            ExerciseItem(name="Patada de tríceps polea",    sets_description="3 × 15 reps · 15 kg"),
            ExerciseItem(name="Fondos en banco",            sets_description="3 × 15 reps · Peso corporal"),
        ]
    },
    5: {
        "label": "Espalda y Bíceps",
        "exercises": [
            ExerciseItem(name="Peso muerto convencional",   sets_description="4 × 6–8 reps · 100 kg"),
            ExerciseItem(name="Remo con barra",             sets_description="3 × 10 reps · 60 kg"),
            ExerciseItem(name="Jalón al pecho polea",       sets_description="3 × 12 reps · 55 kg"),
            ExerciseItem(name="Curl en polea baja",         sets_description="3 × 15 reps · 20 kg"),
            ExerciseItem(name="Curl concentrado",           sets_description="3 × 12 reps · 10 kg"),
        ]
    },
    6: {
        "label": "Core y Movilidad",
        "exercises": [
            ExerciseItem(name="Plancha abdominal",          sets_description="4 × 45 seg · Peso corporal"),
            ExerciseItem(name="Crunch en polea",            sets_description="3 × 20 reps · 15 kg"),
            ExerciseItem(name="Elevación de piernas",       sets_description="3 × 15 reps · Peso corporal"),
            ExerciseItem(name="Oblicuos con mancuerna",     sets_description="3 × 15 reps · 12 kg"),
            ExerciseItem(name="Hiperextensiones",           sets_description="3 × 15 reps · Peso corporal"),
        ]
    },
}

DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']


class RoutineRepository:
    def __init__(self, db: Session):
        self.db = db

    def _get_weekday(self, weekday: Optional[int]) -> int:
        """Devuelve el weekday solicitado o el día actual si no se especifica."""
        if weekday is not None and 0 <= weekday <= 6:
            return weekday
        return datetime.now(timezone.utc).weekday()

    def get_base_routine(self, user_id: int, weekday: Optional[int] = None) -> List[ExerciseItem]:
        """
        Devuelve la rutina base del día indicado (0=lun…6=dom).
        Si weekday es None, usa el día actual.
        """
        day = self._get_weekday(weekday)
        return WEEKLY_SPLIT[day]["exercises"]

    def get_base_routine_label(self, user_id: int, weekday: Optional[int] = None) -> str:
        """Devuelve el nombre del grupo muscular del día indicado."""
        day = self._get_weekday(weekday)
        return WEEKLY_SPLIT[day]["label"]

    def get_day_name(self, weekday: Optional[int] = None) -> str:
        """Devuelve el nombre del día en español."""
        day = self._get_weekday(weekday)
        return DIAS_SEMANA[day]