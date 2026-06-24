# app/seeds/seed_database.py
import random
import json
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select, SQLModel
from app.core.db import engine 
from app.models.history import WorkoutSession, ExerciseLog
from app.models.user import User
from app.core.security import hash_password  # ← Encriptación real integrada

def seed_database():
    print("⏳ Iniciando la generación del ecosistema de datos ampliado...")
    
    # Asegura que las tablas existan en el archivo SQLite antes de insertar datos
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # 1. CREACIÓN DE USUARIOS
        print(" Verificando/Creando perfiles de usuario seguros...")
        
        users_data = [
            {"email": "principiante@gymai.com", "full_name": "Pedro Principiante", "password": "principiante123"},
            {"email": "intermedio@gymai.com", "full_name": "Iván Intermedio", "password": "intermedio123"},
            {"email": "avanzado@gymai.com", "full_name": "Ana Avanzada", "password": "avanzado123"}
        ]
        
        db_users = []
        for u_data in users_data:
            statement = select(User).where(User.email == u_data["email"])
            existing_user = session.exec(statement).first()
            
            if not existing_user:
                # Se encripta la contraseña de forma real usando passlib/bcrypt
                new_user = User(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    hashed_password=hash_password(u_data["password"])
                )
                session.add(new_user)
                session.commit()
                session.refresh(new_user)
                db_users.append(new_user)
                print(f"   ✓ Usuario creado: {u_data['email']}")
            else:
                db_users.append(existing_user)

        # 2. DEFINICIÓN DE PERFILES FISIOLÓGICOS DETALLADOS
        profiles = [
            {
                "user_id": db_users[0].id,
                "type": "Principiante",
                "base_weights": {"bench": 30.0, "squat": 40.0, "row": 25.0, "press": 8.0, "curl": 6.0},
                "weekly_increment": 2.0,
                "skip_probability": 0.25,
                "energy_range": (4, 7),
                "pain_pool": ["lower-back", "quadriceps"]
            },
            {
                "user_id": db_users[1].id,
                "type": "Intermedio",
                "base_weights": {"bench": 70.0, "squat": 90.0, "row": 60.0, "press": 18.0, "curl": 14.0},
                "weekly_increment": 0.8,
                "skip_probability": 0.05,
                "energy_range": (7, 9),
                "pain_pool": ["deltoids"]
            },
            {
                "user_id": db_users[2].id,
                "type": "Avanzado",
                "base_weights": {"bench": 120.0, "squat": 140.0, "row": 95.0, "press": 32.0, "curl": 22.0},
                "weekly_increment": 0.3,
                "skip_probability": 0.0,
                "energy_range": (6, 10),
                "deload_weeks": [4, 8],
                "pain_pool": []
            }
        ]

        # 3. GENERACIÓN DE HISTORIAL DE ENTRENAMIENTO MULTI-MUSCULAR
        now = datetime.now(timezone.utc)

        for profile in profiles:
            print(f"🏋️‍♂️ Inyectando volumen completo (6 ejercicios) para: {profile['type']}")
            
            for week_idx in range(12):
                if random.random() < profile["skip_probability"]:
                    continue

                weeks_ago = 11 - week_idx
                session_date = now - timedelta(weeks=weeks_ago)
                feel = random.randint(*profile["energy_range"])
                
                current_pains = []
                if profile["pain_pool"] and random.random() < 0.20:
                    current_pains = [random.choice(profile["pain_pool"])]

                db_session = WorkoutSession(
                    user_id=profile["user_id"],
                    date=session_date,
                    feel_value=feel,
                    pain_zones_json=json.dumps(current_pains),
                    ai_feedback_log=None
                )
                db_session.exercises = []

                mult = 1.0
                if profile.get("deload_weeks") and week_idx in profile["deload_weeks"]:
                    mult = 0.8
                    db_session.ai_feedback_log = "Semana de deload estratégico detectada. Reducción preventiva del volumen e intensidad."
                    db_session.feel_value = 10

                inc = week_idx * profile["weekly_increment"]
                
                ejercicios_sesion = [
                    {"name": "Press de banca",        "base": profile["base_weights"]["bench"], "sets": 4, "reps": 8,   "mod": 1.0},
                    {"name": "Sentadilla hack",       "base": profile["base_weights"]["squat"], "sets": 4, "reps": 10,  "mod": 1.0},
                    {"name": "Remo con barra",         "base": profile["base_weights"]["row"],   "sets": 3, "reps": 10,  "mod": 1.0},
                    {"name": "Elevación lateral",     "base": profile["base_weights"]["press"], "sets": 3, "reps": 12,  "mod": 0.5},
                    {"name": "Curl de bíceps",        "base": profile["base_weights"]["curl"],  "sets": 3, "reps": 12,  "mod": 0.5},
                    {"name": "Plancha abdominal",      "base": 0.0,                              "sets": 3, "reps": 60,  "mod": 0.0}
                ]

                for ex in ejercicios_sesion:
                    if ex["base"] > 0:
                        calc_weight = (ex["base"] + (inc * ex["mod"])) * mult
                        final_weight = round(calc_weight + random.choice([-1.25, 0, 1.25]), 1)
                        final_reps = ex["reps"] + random.choice([-1, 0, 1]) if mult == 1.0 else ex["reps"]
                    else:
                        final_weight = 0.0
                        final_reps = ex["reps"]

                    log = ExerciseLog(
                        exercise_name=ex["name"],
                        sets_completed=ex["sets"],
                        reps_completed=final_reps,
                        weight_kg=max(0.0, final_weight)
                    )
                    db_session.exercises.append(log)

                session.add(db_session)

        session.commit()
        print("\n✨ Base de datos densamente poblada. ¡Ecosistema muscular y analítico listo!")

if __name__ == "__main__":
    seed_database()