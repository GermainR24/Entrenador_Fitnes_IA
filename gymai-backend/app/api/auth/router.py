from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session

from app.api.auth.repository import UserRepository
from app.api.auth.service import (
    DatabaseError, InvalidCredentialsError,
    UserAlreadyExistsError, UserService,
)
from app.core.db import get_session
from app.core.security import create_access_token, decode_access_token
from app.models.user import AuthResponse, UserCreate, UserLogin, UserPublic

router = APIRouter(prefix="/auth", tags=["Auth"])

# ─── Esquema Bearer para extraer el token del header Authorization ─────────────
bearer_scheme = HTTPBearer(auto_error=False)


# ─── Dependency reutilizable: verifica JWT y devuelve user_id ─────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_session),
) -> UserPublic:
    """
    Se usa como dependencia en cualquier endpoint que requiera autenticación.
    Ejemplo de uso en history/router.py:
        @router.get("/weekly")
        def get_weekly(current_user: UserPublic = Depends(get_current_user)):
            ...
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )

    return UserPublic.model_validate(user)


# ─── Endpoints públicos ───────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
async def register(payload: UserCreate, db: Session = Depends(get_session)):
    service = UserService(UserRepository(db))
    try:
        nuevo_usuario = service.register(payload)
        token = create_access_token(nuevo_usuario.id, nuevo_usuario.email)
        return AuthResponse(
            status="success",
            token=token,
            usuario=UserPublic.model_validate(nuevo_usuario),
        )
    except UserAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DatabaseError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, db: Session = Depends(get_session)):
    service = UserService(UserRepository(db))
    try:
        user  = service.login(payload)
        token = create_access_token(user.id, user.email)
        return AuthResponse(
            status="success",
            token=token,
            usuario=UserPublic.model_validate(user),
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=UserPublic)
def get_me(current_user: UserPublic = Depends(get_current_user)):
    """Devuelve los datos del usuario autenticado. Útil para validar el token al recargar."""
    return current_user