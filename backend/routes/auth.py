from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta, time, date
from passlib.context import CryptContext
from jose import jwt
import os

from db import users_collection

# =========================
# CONFIG
# =========================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60))

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set in environment variables")

# Argon2 ONLY (no bcrypt)
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

auth_router = APIRouter()

# =========================
# Pydantic Schemas
# =========================
class SignupRequest(BaseModel):
    user_name: str
    user_email: EmailStr
    password: str = Field(min_length=8, max_length=1024)
    weight_kg: float
    date_of_birth: date
    gender: str


class LoginRequest(BaseModel):
    user_email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# =========================
# UTILS
# =========================
def hash_password(password: str) -> str:
    print("[hash_password] Hashing password using Argon2")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    print("[verify_password] Verifying password using Argon2")
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    print("[create_access_token] Creating JWT token")
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

# =========================
# ROUTES
# =========================

@auth_router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest):
    print("[SIGNUP] Request received:", payload.user_email)
    try:
        print("[SIGNUP] Checking if user already exists")
        existing_user = users_collection.find_one(
            {"user_email": payload.user_email}
        )

        if existing_user:
            print("[SIGNUP] Email already registered")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        print("[SIGNUP] Hashing password")
        hashed_pwd = hash_password(payload.password)
        dob_datetime =  datetime.combine(payload.date_of_birth, time.min)

        user_doc = {
            "user_name": payload.user_name,
            "user_email": payload.user_email,
            "password_hash": hashed_pwd,
            "weight_kg": payload.weight_kg,
            "date_of_birth": dob_datetime,
            "gender": payload.gender,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        print("[SIGNUP] Inserting user into MongoDB")
        result = users_collection.insert_one(user_doc)
        print("Result of inserting into MongoDB users: ", result)

        print("[SIGNUP] Generating access token")
        token = create_access_token({
            "user_id": str(result.inserted_id),
            "user_email": payload.user_email
        })

        print("[SIGNUP] Signup successful")
        return {
            "access_token": token,
            "token_type": "bearer"
        }

    except HTTPException as e:
        print("[SIGNUP][HTTPException]", e.detail)
        raise
    except Exception as e:
        print("[SIGNUP][Exception]", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed"
        )


@auth_router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    print("[LOGIN] Request received:", payload.user_email)
    try:
        print("[LOGIN] Fetching user from DB")
        user = users_collection.find_one(
            {"user_email": payload.user_email}
        )

        if not user:
            print("[LOGIN] User not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        print("[LOGIN] Verifying password")
        if not verify_password(payload.password, user["password_hash"]):
            print("[LOGIN] Password mismatch")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        print("[LOGIN] Generating access token")
        token = create_access_token({
            "user_id": str(user["_id"]),
            "user_email": user["user_email"]
        })

        print("[LOGIN] Login successful")
        return {
            "access_token": token,
            "token_type": "bearer"
        }

    except HTTPException as e:
        print("[LOGIN][HTTPException]", e.detail)
        raise
    except Exception as e:
        print("[LOGIN][Exception]", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@auth_router.post("/logout")
def logout():
    print("[LOGOUT] Request received")
    try:
        print("[LOGOUT] Stateless JWT logout")
        return {
            "message": "Logout successful. Please remove token from client."
        }
    except Exception as e:
        print("[LOGOUT][Exception]", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )
