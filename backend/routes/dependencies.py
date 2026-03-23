from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from bson import ObjectId
import os

from db import users_collection

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set in environment variables")


def get_current_user(request: Request):
    print("[AUTH][DEP] get_current_user called")

    try:
        token = request.cookies.get("access_token")
        if not token:
            print("[AUTH][DEP] Token missing from cookies")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        print("[AUTH][DEP] Token received from cookies")

        print("[AUTH][DEP] Decoding JWT")
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("user_id")
        print("[AUTH][DEP] user_id from token:", user_id)

        if not user_id:
            print("[AUTH][DEP] user_id missing in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        print("[AUTH][DEP] Fetching user from MongoDB")
        user = users_collection.find_one(
            {"_id": ObjectId(user_id)}
        )

        if not user:
            print("[AUTH][DEP] User not found in DB")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        print("[AUTH][DEP] User authenticated successfully")
        return user

    except JWTError as e:
        print("[AUTH][DEP][JWTError]", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    except Exception as e:
        print("[AUTH][DEP][Exception]", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )
