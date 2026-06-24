
from app.api.auth.repository import UserRepository
from app.core.security import hash_password, verify_password
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.models.user import User, UserCreate, UserLogin


class UserAlreadyExistsError(Exception):
    pass

class DatabaseError(Exception):
    pass

class InvalidCredentialsError(Exception):
    pass


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def register(self, user_create: UserCreate) -> User:
        if self.repository.get_by_email(user_create.email):
            raise UserAlreadyExistsError("Email ya registrado")

        user = User(
            hashed_password=hash_password(user_create.password),  # ← bcrypt real
            **user_create.model_dump(exclude={"password"})
        )

        try:
            return self.repository.create(user=user)
        except IntegrityError:
            raise UserAlreadyExistsError("Conflicto de integridad: email ya existe")
        except SQLAlchemyError:
            raise DatabaseError("Error interno al crear el usuario")

    def login(self, user_login: UserLogin) -> User:
        user = self.repository.get_by_email(user_login.email)
        # verify_password compara texto plano contra el hash bcrypt
        if not user or not verify_password(user_login.password, user.hashed_password):
            raise InvalidCredentialsError("Email o contraseña incorrectos")
        return user