from sqlmodel import Session, select
from typing import List
from datetime import datetime, timezone
from app.models.routine import ExerciseItem
from app.models.history import WorkoutSession, ExerciseLog

# ─── Split semanal: 0=lunes … 6=domingo ──────────────────────────────────────
# Cada día tiene un grupo muscular distinto con ejercicios y pesos base.
# Los pesos son valores de referencia intermedios — la IA los ajusta
# en process_daily_checkin() según feel_value y pain_zones.

WEEKLY_SPLIT = {
    0: {  # Lunes — Pecho + Tríceps
        "label": "Pecho y Tríceps",
        "exercises": [
            ExerciseItem(name="Press de banca",             sets_description="4 × 8–10 reps · 75 kg"),
            ExerciseItem(name="Press inclinado mancuernas", sets_description="3 × 10–12 reps · 28 kg"),
            ExerciseItem(name="Fondos en paralelas",        sets_description="3 × 12 reps · Peso corporal"),
            ExerciseItem(name="Press francés",              sets_description="3 × 12 reps · 20 kg"),
            ExerciseItem(name="Extensiones polea alta",     sets_description="3 × 15 reps · 15 kg"),
        ]
    },
    1: {  # Martes — Espalda + Bíceps
        "label": "Espalda y Bíceps",
        "exercises": [
            ExerciseItem(name="Remo con mancuerna",         sets_description="4 × 10–12 reps · 30 kg"),
            ExerciseItem(name="Dominadas asistidas",        sets_description="3 × 8–10 reps · Peso corporal"),
            ExerciseItem(name="Remo en polea baja",         sets_description="3 × 12 reps · 50 kg"),
            ExerciseItem(name="Curl de bíceps mancuernas",  sets_description="3 × 12 reps · 14 kg"),
            ExerciseItem(name="Curl martillo",              sets_description="3 × 12 reps · 12 kg"),
        ]
    },
    2: {  # Miércoles — Piernas + Glúteos
        "label": "Piernas y Glúteos",
        "exercises": [
            ExerciseItem(name="Sentadilla con barra",       sets_description="4 × 8–10 reps · 80 kg"),
            ExerciseItem(name="Prensa de piernas",          sets_description="3 × 12 reps · 120 kg"),
            ExerciseItem(name="Zancadas con mancuernas",    sets_description="3 × 12 reps · 20 kg"),
            ExerciseItem(name="Peso muerto rumano",         sets_description="3 × 10 reps · 60 kg"),
            ExerciseItem(name="Elevación de talones",       sets_description="4 × 15 reps · Peso corporal"),
        ]
    },
    3: {  # Jueves — Hombros + Trapecios
        "label": "Hombros y Trapecios",
        "exercises": [
            ExerciseItem(name="Press militar mancuernas",   sets_description="4 × 8–10 reps · 22 kg"),
            ExerciseItem(name="Elevaciones laterales",      sets_description="4 × 12–15 reps · 10 kg"),
            ExerciseItem(name="Elevaciones frontales",      sets_description="3 × 12 reps · 8 kg"),
            ExerciseItem(name="Pájaros con mancuernas",     sets_description="3 × 15 reps · 8 kg"),
            ExerciseItem(name="Encogimientos de hombros",   sets_description="3 × 15 reps · 30 kg"),
        ]
    },
    4: {  # Viernes — Pecho + Tríceps (segunda sesión)
        "label": "Pecho y Tríceps",
        "exercises": [
            ExerciseItem(name="Press de banca inclinado",   sets_description="4 × 8–10 reps · 65 kg"),
            ExerciseItem(name="Aperturas con mancuernas",   sets_description="3 × 12 reps · 18 kg"),
            ExerciseItem(name="Pullover con mancuerna",     sets_description="3 × 12 reps · 22 kg"),
            ExerciseItem(name="Patada de tríceps polea",    sets_description="3 × 15 reps · 15 kg"),
            ExerciseItem(name="Fondos en banco",            sets_description="3 × 15 reps · Peso corporal"),
        ]
    },
    5: {  # Sábado — Espalda + Bíceps (segunda sesión)
        "label": "Espalda y Bíceps",
        "exercises": [
            ExerciseItem(name="Peso muerto convencional",   sets_description="4 × 6–8 reps · 100 kg"),
            ExerciseItem(name="Remo con barra",             sets_description="3 × 10 reps · 60 kg"),
            ExerciseItem(name="Jalón al pecho polea",       sets_description="3 × 12 reps · 55 kg"),
            ExerciseItem(name="Curl en polea baja",         sets_description="3 × 15 reps · 20 kg"),
            ExerciseItem(name="Curl concentrado",           sets_description="3 × 12 reps · 10 kg"),
        ]
    },
    6: {  # Domingo — Descanso activo / Core
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


class RoutineRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_base_routine(self, user_id: int) -> List[ExerciseItem]:
        """
        Devuelve la rutina base del día según el split semanal.
        0=lunes … 6=domingo (Python weekday()).

        En el futuro esto puede consultar la BD para:
        - Ajustar pesos según el último peso registrado por el usuario
        - Detectar si ya entrenó hoy y sugerir el día siguiente
        - Personalizar el split según el nivel del usuario
        """
        weekday = datetime.now(timezone.utc).weekday()  # 0=lun … 6=dom
        day_plan = WEEKLY_SPLIT.get(weekday, WEEKLY_SPLIT[0])
        return day_plan["exercises"]

    def get_base_routine_label(self, user_id: int) -> str:
        """Devuelve el nombre del grupo muscular de hoy (para mostrarlo en el Planner)."""
        weekday = datetime.now(timezone.utc).weekday()
        day_plan = WEEKLY_SPLIT.get(weekday, WEEKLY_SPLIT[0])
        return day_plan["label"]