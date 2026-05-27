from fastapi import APIRouter, HTTPException, status, Response, Depends
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta, time, date
from passlib.context import CryptContext
from jose import jwt
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from db import users_collection, password_reset_tokens_collection

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

class ForgotPasswordRequest(BaseModel):
    user_email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=1024)

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
def signup(payload: SignupRequest, response: Response):
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
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=JWT_EXPIRE_MINUTES * 60
        )
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
def login(payload: LoginRequest, response: Response):
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
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=JWT_EXPIRE_MINUTES * 60
        )
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
def logout(response: Response):
    print("[LOGOUT] Request received")
    try:
        print("[LOGOUT] Stateless JWT logout via cookie clearing")
        response.delete_cookie(
            key="access_token",
            httponly=True,
            secure=True,
            samesite="none"
        )
        return {
            "message": "Logout successful."
        }
    except Exception as e:
        print("[LOGOUT][Exception]", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

def send_reset_email(to_email: str, token: str):
    gmail_user = os.getenv("GMAIL_USER")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not gmail_user or not gmail_password:
        print("[EMAIL] GMAIL_USER or GMAIL_APP_PASSWORD not set. Email not sent.")
        return # Skip sending email if not configured

    # The frontend URL for password reset
    # Assuming frontend is on port 5173 for Vite or 3000 for CRA, this can be an env var
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    msg = MIMEMultipart()
    msg['From'] = gmail_user
    msg['To'] = to_email
    msg['Subject'] = "FitMetrics - Password Reset Request"

    body = f"""
    Hello,

    We received a request to reset your password for FitMetrics.
    Click the link below to set a new password:

    {reset_link}

    If you did not request this, please ignore this email.

    Thanks,
    FitMetrics Team
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(gmail_user, gmail_password)
        text = msg.as_string()
        server.sendmail(gmail_user, to_email, text)
        server.quit()
        print(f"[EMAIL] Reset email sent to {to_email}")
    except Exception as e:
        print(f"[EMAIL] Failed to send email: {e}")

@auth_router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    print("[FORGOT_PASSWORD] Request received for:", payload.user_email)
    user = users_collection.find_one({"user_email": payload.user_email})
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(minutes=15)

    password_reset_tokens_collection.insert_one({
        "user_email": payload.user_email,
        "token": token,
        "expires_at": expiry
    })

    send_reset_email(payload.user_email, token)

    return {"message": "If that email is registered, a reset link has been sent."}


@auth_router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    print("[RESET_PASSWORD] Request received")
    
    token_doc = password_reset_tokens_collection.find_one({"token": payload.token})
    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    if datetime.utcnow() > token_doc["expires_at"]:
        password_reset_tokens_collection.delete_one({"_id": token_doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    hashed_pwd = hash_password(payload.new_password)
    users_collection.update_one(
        {"user_email": token_doc["user_email"]},
        {"$set": {"password_hash": hashed_pwd, "updated_at": datetime.utcnow()}}
    )

    password_reset_tokens_collection.delete_many({"user_email": token_doc["user_email"]})

    return {"message": "Password successfully reset."}

from routes.dependencies import get_current_user

@auth_router.get("/validate")
def validate_session(current_user=Depends(get_current_user)):
    print("[VALIDATE] Session is valid")
    return {
        "status": "authenticated",
        "user_email": current_user["user_email"],
        "user_name": current_user["user_name"]
    }
