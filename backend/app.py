from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routes.auth import auth_router
from routes.history import history_router
from routes.ai_conversations import ai_router

# =========================
# APP INITIALIZATION
# =========================

app = FastAPI(
    title="FitMetrics API",
    description="Backend API for FitMetrics (Nutrition & Fitness Analytics)",
    version="1.0.0"
)

# =========================
# CORS CONFIGURATION
# =========================
# Allow React frontend to communicate with FastAPI

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React (CRA)
        "http://127.0.0.1:3000",
        "https://yash-limbachiya-fitmetrics.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ROUTERS
# =========================

app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"]
)

app.include_router(
    ai_router,
    prefix="/ai",
    tags=["AI Conversations"]
)

app.include_router(
    history_router,
    prefix="/history",
    tags=["Nutrition History"]
)

# =========================
# HEALTH CHECK
# =========================

@app.get("/")
def root():
    return {
        "status": "running",
        "message": "FitMetrics backend is running"
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }
