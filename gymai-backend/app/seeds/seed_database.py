# seed_database.py
from datetime import datetime, timedelta, timezone
import random
from sqlmodel import Session, select
from app.core.db import engine 
from app.models.history import WorkoutSession, ExerciseLog
from app.models.user import User

def seed_database():
    print("⏳ Iniciando la generación del ecosistema de datos...")

    with Session(engine) as session:
        # 1. CREACIÓN DE USUARIOS (El Cimiento)
        print(" Verificando/Creando perfiles de usuario...")
        
        users_data = [
            {"email": "principiante@gymai.com", "full_name": "Pedro Principiante", "hashed_password": "principiante123"},
            {"email": "intermedio@gymai.com", "full_name": "Iván Intermedio", "hashed_password": "intermedio123"},
            {"email": "avanzado@gymai.com", "full_name": "Ana Avanzada", "hashed_password": "avanzado123"}
        ]
        
        db_users = []
        for u_data in users_data:
            # Buscamos si el usuario ya existe para no romper la restricción UNIQUE del email
            statement = select(User).where(User.email == u_data["email"])
            existing_user = session.exec(statement).first()
            
            if not existing_user:
                # Si no existe, lo creamos. Usamos un hash falso solo para propósitos del seeder
                new_user = User(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    hashed_password=u_data["hashed_password"]
                )
                session.add(new_user)
                session.commit()
                session.refresh(new_user)
                db_users.append(new_user)
            else:
                db_users.append(existing_user)

        # 2. DEFINICIÓN DE PERFILES FISIOLÓGICOS
        # Asignamos los IDs reales que la base de datos acaba de generar
        profiles = [
            {
                "user_id": db_users[0].id,
                "type": "Principiante",
                "base_weight_bench": 30.0,
                "weekly_increment": 2.5, # Sube peso muy rápido (Newbie gains)
                "skip_probability": 0.3, # 30% de probabilidad de faltar en la semana
                "energy_range": (4, 8)
            },
            {
                "user_id": db_users[1].id,
                "type": "Intermedio",
                "base_weight_bench": 70.0,
                "weekly_increment": 1.0, # Sube de a poco, más realista
                "skip_probability": 0.0, # Muy disciplinado, no falta
                "energy_range": (7, 9)
            },
            {
                "user_id": db_users[2].id,
                "type": "Avanzado",
                "base_weight_bench": 120.0,
                "weekly_increment": 0.0, # Ya casi no sube linealmente
                "skip_probability": 0.0,
                "energy_range": (6, 10),
                "deload_weeks": [4, 8] # Semanas de descarga donde baja el peso
            }
        ]

        # 3. GENERACIÓN DE HISTORIAL DE ENTRENAMIENTO
        now = datetime.now(timezone.utc)

        for profile in profiles:
            print(f"🏋️‍♂️ Inyectando 12 semanas de entrenamiento para: {profile['type']} (ID: {profile['user_id']})")
            
            for week_idx in range(12):
                # Simulamos faltas al gimnasio
                if random.random() < profile["skip_probability"]:
                    continue

                weeks_ago = 11 - week_idx
                session_date = now - timedelta(weeks=weeks_ago)
                feel = random.randint(*profile["energy_range"])

                # Creamos la sesión padre
                db_session = WorkoutSession(
                    user_id=profile["user_id"],
                    date=session_date,
                    feel_value=feel,
                    pain_zones_json="[]",
                    ai_feedback_log=None
                )

                db_session.exercises = []
                
                # Matemática de la sobrecarga progresiva
                current_weight = profile["base_weight_bench"] + (week_idx * profile["weekly_increment"])

                # Aplicamos las descargas (Deload) del usuario Avanzado
                if profile.get("deload_weeks") and week_idx in profile["deload_weeks"]:
                    current_weight = current_weight * 0.8 # Baja el peso un 20%
                    db_session.ai_feedback_log = "Semana de descarga. Excelente gestión de la fatiga central."
                    db_session.feel_value = 10 # Energía a tope por el descanso activo

                # Creamos el registro del ejercicio hijo
                log = ExerciseLog(
                    exercise_name="Press de banca",
                    sets_completed=4,
                    reps_completed=8,
                    weight_kg=round(current_weight, 1)
                )
                db_session.exercises.append(log)

                # También agregamos un ejercicio de piernas constante para ver variedad en la app
                log_piernas = ExerciseLog(
                    exercise_name="Sentadilla hack",
                    sets_completed=4,
                    reps_completed=10,
                    weight_kg=round(current_weight * 1.3, 1) # Generalmente se levanta más en piernas
                )
                db_session.exercises.append(log_piernas)

                session.add(db_session)

        # Confirmamos toda la transacción
        session.commit()
        print("\nBase de datos poblada con éxito! El ecosistema está listo.")

if __name__ == "__main__":
    seed_database()