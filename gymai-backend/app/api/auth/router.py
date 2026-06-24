from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.api.auth.repository import UserRepository
from app.api.auth.service import DatabaseError, InvalidCredentialsError, UserAlreadyExistsError, UserService
from app.core.db import get_session
from app.models.user import AuthResponse, AuthResponse, UserCreate, UserLogin, UserPublic


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=AuthResponse)
async def register(payload: UserCreate, db: Session = Depends(get_session)):
    service = UserService(UserRepository(db))
    try:
        nuevo_usuario = service.register(payload)
        access_token = f"jwt_token_mock_para_{nuevo_usuario.id}"
        return AuthResponse(
            status="success",
            token=access_token,
            usuario=nuevo_usuario
        )
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/login")
async def login(
    payload: UserLogin,
    db: Session = Depends(get_session)
):
    service = UserService(UserRepository(db))
    try:
        user =service.login(payload)
        access_token = f"jwt_token_mock_para_{user.id}"
        return AuthResponse(
            status="success",
            token=access_token,
            usuario=user
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )