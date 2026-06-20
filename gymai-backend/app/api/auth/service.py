from app.api.auth.repository import UserRepository
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
            hashed_password=(user_create.password),
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
        if not user or user.hashed_password != user_login.password:
            raise InvalidCredentialsError("User/password inválido")
        return user
