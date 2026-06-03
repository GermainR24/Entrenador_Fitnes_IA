from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.auth.router import router as auth_router
from app.api.routines.router import router  as routine_router
from app.api.history.router import router  as history_router
from app.api.scan.router import router  as scan_router
from app.core.db import init_db
from app.core.middleware import register_middleware
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="MiniBlog",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization":True}
)

register_middleware(app=app)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(routine_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(scan_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Backend de GymAI conectado y funcionando"}
