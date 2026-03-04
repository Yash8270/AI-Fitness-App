from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, date, time
from typing import List, Dict, Optional

from db import nutrition_history_collection, users_collection
from routes.dependencies import get_current_user

history_router = APIRouter()

def calculate_completion(consumed: Dict, targets: Dict) -> Dict:
    return {
        "protein_percent": round(consumed.get("protein_g", 0) / max(targets.get("protein_g", 1), 1) * 100, 2),
        "calories_percent": round(consumed.get("calories_kcal", 0) / max(targets.get("calories_kcal", 1), 1) * 100, 2),
        "carbs_percent": round(consumed.get("carbs_g", 0) / max(targets.get("carbs_g", 1), 1) * 100, 2),
        "fats_percent": round(consumed.get("fats_g", 0) / max(targets.get("fats_g", 1), 1) * 100, 2),
        "calcium_percent": round(consumed.get("calcium_mg", 0) / max(targets.get("calcium_mg", 1), 1) * 100, 2),
        "iron_percent": round(consumed.get("iron_mg", 0) / max(targets.get("iron_mg", 1), 1) * 100, 2),
        "zinc_percent": round(consumed.get("zinc_mg", 0) / max(targets.get("zinc_mg", 1), 1) * 100, 2),
        "fiber_percent": round(consumed.get("fiber_g", 0) / max(targets.get("fiber_g", 1), 1) * 100, 2),
        "water_percent": round(consumed.get("water_l", 0) / max(targets.get("water_l", 1), 1) * 100, 2),
    }


# =========================
# SCHEMAS
# =========================

class FoodItem(BaseModel):
    name: str
    protein_g: float = 0
    calories_kcal: float = 0
    carbs_g: float = 0
    fats_g: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0
    zinc_mg: float = 0
    magnesium_mg: float = 0
    potassium_mg: float = 0
    fiber_g: float = 0
    water_l: float = 0


class SaveHistoryRequest(BaseModel):
    date: date
    consumed: Dict
    targets: Dict  # ⛔ ignored for storage, kept for backward compatibility
    foods: List[FoodItem]

class UpdateHistoryRequest(BaseModel):
    consumed: Optional[Dict] = None
    foods: Optional[List[FoodItem]] = None


# =========================
# INTERNAL UTILITY (DO NOT DELETE)
# Used by AI auto-save
# =========================

def save_or_update_history(
    *,
    user_email: str,
    payload: SaveHistoryRequest
):
    history_date = datetime.combine(payload.date, time.min)

    # 🔹 Fetch targets from users collection
    user = users_collection.find_one(
        {"user_email": user_email},
        {"targets": 1}
    )

    if not user or not user.get("targets"):
        raise HTTPException(
            status_code=400,
            detail="Nutrition targets not set for user"
        )

    targets = user["targets"]
    consumed = payload.consumed

    # 🔹 Find existing history
    existing = nutrition_history_collection.find_one({
        "user_email": user_email,
        "date": history_date
    })

    # 🔹 Completion calculation (safe)
    completion = {
        "protein_percent": round(consumed.get("protein_g", 0) / max(targets.get("protein_g", 1), 1) * 100, 2),
        "calories_percent": round(consumed.get("calories_kcal", 0) / max(targets.get("calories_kcal", 1), 1) * 100, 2),
        "carbs_percent": round(consumed.get("carbs_g", 0) / max(targets.get("carbs_g", 1), 1) * 100, 2),
        "fats_percent": round(consumed.get("fats_g", 0) / max(targets.get("fats_g", 1), 1) * 100, 2),
        "calcium_percent": round(consumed.get("calcium_mg", 0) / max(targets.get("calcium_mg", 1), 1) * 100, 2),
        "iron_percent": round(consumed.get("iron_mg", 0) / max(targets.get("iron_mg", 1), 1) * 100, 2),
        "zinc_percent": round(consumed.get("zinc_mg", 0) / max(targets.get("zinc_mg", 1), 1) * 100, 2),
        "fiber_percent": round(consumed.get("fiber_g", 0) / max(targets.get("fiber_g", 1), 1) * 100, 2),
        "water_percent": round(consumed.get("water_l", 0) / max(targets.get("water_l", 1), 1) * 100, 2),
    }

    # 🔹 Document to store (NO TARGETS STORED)
    doc = {
        "user_email": user_email,
        "date": history_date,
        "consumed": consumed,
        "completion": completion,
        "foods": [food.dict() for food in payload.foods],
        "updated_at": datetime.utcnow(),
    }

    if existing:
        nutrition_history_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": doc}
        )
    else:
        doc["created_at"] = datetime.utcnow()
        nutrition_history_collection.insert_one(doc)


# =========================
# ROUTES (MANUAL / API)
# =========================

@history_router.post("/save")
def save_daily_history(
    payload: SaveHistoryRequest,
    current_user=Depends(get_current_user)
):
    """
    Save or update daily nutrition history (manual API)
    """
    try:
        save_or_update_history(
            user_email=current_user["user_email"],
            payload=payload
        )
        return {"message": "History saved"}

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to save nutrition history"
        )


@history_router.get("/all")
def get_all_history(
    current_user=Depends(get_current_user)
):
    """
    Fetch all nutrition history for logged-in user
    """
    try:
        history = list(
            nutrition_history_collection.find(
                {"user_email": current_user["user_email"]}
            ).sort("date", -1)
        )

        # Convert ObjectId and datetime to serializable types
        for entry in history:
            entry["_id"] = str(entry["_id"])
            if isinstance(entry.get("date"), datetime):
                entry["date"] = entry["date"].isoformat()

        return {
            "count": len(history),
            "data": history
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch nutrition history"
        )


@history_router.delete("/delete/{history_date}")
def delete_history_by_date(
    history_date: date,
    current_user=Depends(get_current_user)
):
    """
    Delete nutrition history for a specific date
    """
    try:
        history_dt = datetime.combine(history_date, time.min)

        result = nutrition_history_collection.delete_one({
            "user_email": current_user["user_email"],
            "date": history_dt
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="History not found")

        return {"message": "History deleted successfully"}

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete history"
        )

@history_router.patch("/update/{history_date}")
def update_history_partial(
    history_date: date,
    payload: UpdateHistoryRequest,
    current_user=Depends(get_current_user)
):
    try:
        history_dt = datetime.combine(history_date, time.min)

        history = nutrition_history_collection.find_one({
            "user_email": current_user["user_email"],
            "date": history_dt
        })

        if not history:
            raise HTTPException(status_code=404, detail="History not found")

        # 🔹 Fetch targets
        user = users_collection.find_one(
            {"user_email": current_user["user_email"]},
            {"targets": 1}
        )

        if not user or not user.get("targets"):
            raise HTTPException(status_code=400, detail="Targets not set")

        targets = user["targets"]

        update_fields = {}

        # 🔹 Update consumed partially
        if payload.consumed:
            updated_consumed = history.get("consumed", {})
            updated_consumed.update(payload.consumed)

            update_fields["consumed"] = updated_consumed
            update_fields["completion"] = calculate_completion(updated_consumed, targets)

        # 🔹 Update foods only if provided
        if payload.foods is not None:
            update_fields["foods"] = [food.dict() for food in payload.foods]

        update_fields["updated_at"] = datetime.utcnow()

        nutrition_history_collection.update_one(
            {"_id": history["_id"]},
            {"$set": update_fields}
        )

        return {"message": "History updated successfully"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to update history"
        )