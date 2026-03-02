from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, date, time
import json
import re
import google.generativeai as genai
import os

from db import ai_conversations_collection, users_collection, nutrition_history_collection
from routes.dependencies import get_current_user
from routes.history import save_or_update_history, SaveHistoryRequest

# =========================
# NUTRIENT BUFFER CONFIG
# =========================

NUTRIENT_BUFFER = {
    "protein_g": -15,
    "calories_kcal": 0,
    "carbs_g": 0,
    "fats_g": 5,
    "calcium_mg": 350,
    "iron_mg": 6,
    "zinc_mg": 1.75,
    "magnesium_mg": 0,
    "potassium_mg": 1100,
    "fiber_g": -2,
    "water_l": 0
}

def apply_buffer(consumed: dict) -> dict:
    """
    Adds fixed buffer to each nutrient before saving to DB
    """
    buffered = {}
    for key, value in consumed.items():
        base = float(value or 0)
        buffer_val = NUTRIENT_BUFFER.get(key, 0)
        buffered[key] = round(base + buffer_val, 2)
    return buffered



# =========================
# CONFIG
# =========================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("models/gemini-flash-latest")

ai_router = APIRouter()

# =========================
# HELPERS
# =========================

def extract_json_block(text: str):
    """Extract JSON inside ```json ... ```"""
    match = re.search(r"```json(.*?)```", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None

def remove_json_block(text: str) -> str:
    """
    Removes ```json ... ``` from AI response
    """
    return re.sub(r"```json.*?```", "", text, flags=re.S).strip()    

def extract_save_diet_tag(prompt: str):
    """
    Extract [SAVE_DIET:YYYY-MM-DD] tag from prompt
    Returns (diet_date, clean_prompt) or (None, prompt)
    """
    match = re.search(r"\[SAVE_DIET:(\d{4}-\d{2}-\d{2})\]", prompt)
    if match:
        diet_date = match.group(1)
        clean_prompt = re.sub(r"\[SAVE_DIET:\d{4}-\d{2}-\d{2}\]", "", prompt).strip()
        return diet_date, clean_prompt
    return None, prompt

def calculate_age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - (
        (today.month, today.day) < (dob.month, dob.day)
    )


def is_meal_log(prompt: str) -> bool:
    prompt_l = prompt.lower()

    # Strong indicators of meal logging
    meal_keywords = [
        "today diet",
        "today's diet",
        "today i ate",
        "today i have eaten",
        "my meals",
        "what i ate",
        "after gym",
        "breakfast",
        "lunch",
        "dinner",
        "yesterday",
        "calculate my diet"
    ]

    food_units = [
        "g ", "gm", "grams",
        "ml", "litre", "liter",
        "roti", "rotis", "chapati",
        "paneer", "milk", "oats", "dal",
        "soya", "moong", "chana", "capsicum"
    ]

    # If user mentions foods + quantities → meal
    if any(k in prompt_l for k in meal_keywords) and any(u in prompt_l for u in food_units):
        return True

    # Even without "today", food-heavy prompts should count
    if sum(u in prompt_l for u in food_units) >= 3:
        return True

    return False



def build_target_prompt(age: int, weight: float, activity_type: str) -> str:
    return f"""
You are a certified sports nutritionist.

User details:
- Age: {age} years
- Weight: {weight} kg
- Activity type: {activity_type}

TASK:
Calculate DAILY NUTRITION TARGETS.

RETURN ONLY JSON:
```json
{{
  "targets": {{
    "protein_g": number,
    "calories_kcal": number,
    "carbs_g": number,
    "fats_g": number,
    "calcium_mg": number,
    "iron_mg": number,
    "zinc_mg": number,
    "magnesium_mg": number,
    "potassium_mg": number,
    "fiber_g": number,
    "water_l": number
  }},
  "activity_type": "{activity_type}"
}}
```
"""
    

def build_meal_prompt(prompt: str, diet_date: str = None) -> str:
    date_str = diet_date if diet_date else date.today().isoformat()
    
    return f"""
You are a CERTIFIED SPORTS NUTRITIONIST and DIET DATA ANALYST.

Your task is to calculate REALISTIC DAILY NUTRITION
for INDIAN HOME-COOKED FOOD using conservative household assumptions.

Be ACCURATE and UNDER-CONSERVATIVE.
Never overestimate calories, fats, or protein.

========================
CRITICAL CONTEXT
========================
User is logging meals for date: {date_str}
Foods are INDIAN, HOME-COOKED, NOT restaurant food.

========================
NON-STANDARD / UNQUANTIFIED FOODS (VERY IMPORTANT)
========================

If the user mentions foods WITHOUT exact quantity, FOLLOW THESE RULES STRICTLY:

🔹 SABJI / CURRY / MIXED VEGETABLE
- Assume 1 medium katori ≈ 150 g cooked
- Oil used ≈ 1 tsp TOTAL (not per serving)
- Calories should stay LOW-MODERATE
- Protein should be LOW unless paneer / dal / soya is explicitly mentioned

🔹 PANEER BHURJI
- Count ONLY paneer quantity if mentioned
- Vegetables (onion, capsicum, tomato) add MINIMAL calories
- Oil ≈ 1 tsp per 100 g paneer (max)

🔹 MUTHIYA / HANDVO / DHOKLA / UTTAPPA
- Assume SMALL homemade piece
- Do NOT assume cheese, butter, or excess oil
- Calories ≈ roti-equivalent unless stated otherwise

🔹 EGGS / EGG DISHES
- 1 egg ≈ 6 g protein, 70 kcal
- If "egg curry" → assume minimal gravy calories
- Do NOT add oil unless stated

🔹 "MIXED", "SMALL", "HOMEMADE"
→ Always choose the LOWER realistic value

========================
ABSOLUTE HARD RULES
========================

❌ NEVER invent:
- Extra oil
- Butter / cheese
- Restaurant portions
- Multiple servings

❌ NEVER split a food unless user explicitly splits it

❌ NEVER convert cooked food to raw weight

❌ NEVER exceed realistic digestion limits

❌ Whatever amount of water is mentioned, only consider that amount of water not anything extra

========================
STANDARD BASELINES
========================

ROTI
- 1 medium ≈ 100 kcal, 3.5 g protein

DAL / MOONG (COOKED)
- 1 katori ≈ 100–120 kcal, 6–7 g protein

PANEER
- 100 g ≈ 18 g protein, 20 g fat

VEGETABLE SABJI
- Calories mostly from vegetables, not oil
- Protein usually < 3 g unless legumes included

========================
TASK
========================
1. Parse ONLY foods mentioned by the user
2. If quantity missing → apply conservative household estimate
3. Aggregate same foods into ONE daily total
4. Calculate nutrients using MIDPOINT values
5. Return totals as exact sums

========================
RETURN FORMAT (MANDATORY)
========================

Human Explanation (brief, no JSON mention)
```json
{{
  "date": "{date_str}",
  "consumed": {{
    "protein_g": number,
    "calories_kcal": number,
    "carbs_g": number,
    "fats_g": number,
    "calcium_mg": number,
    "iron_mg": number,
    "zinc_mg": number,
    "magnesium_mg": number,
    "potassium_mg": number,
    "fiber_g": number,
    "water_l": number
  }},
  "foods": [
    {{
      "name": "FOOD (aggregated)",
      "protein_g": number,
      "calories_kcal": number,
      "carbs_g": number,
      "fats_g": number,
      "calcium_mg": number,
      "iron_mg": number,
      "zinc_mg": number,
      "magnesium_mg": number,
      "potassium_mg": number,
      "fiber_g": number,
      "water_l": number
    }}
  ]
}}
```
========================
USER INPUT
========================
{prompt}
"""

# =========================
# SCHEMAS
# =========================

class AIRequest(BaseModel):
    prompt: str


class AIResponse(BaseModel):
    response: str

# =========================
# ROUTES
# =========================

@ai_router.post("/ask", response_model=AIResponse)
def ask_ai(payload: AIRequest, current_user=Depends(get_current_user)):
    user_email = current_user["user_email"]

    if ai_conversations_collection.find_one({"user_email": user_email}):
        raise HTTPException(status_code=400, detail="Chat already exists")

    return _handle_ai(payload.prompt, current_user, first=True)


@ai_router.patch("/update", response_model=AIResponse)
def update_chat(payload: AIRequest, current_user=Depends(get_current_user)):
    if not ai_conversations_collection.find_one({"user_email": current_user["user_email"]}):
        raise HTTPException(status_code=404, detail="Chat does not exist")

    return _handle_ai(payload.prompt, current_user, first=False)


# =========================
# CORE HANDLER
# =========================

def _handle_ai(prompt: str, current_user, first: bool):
    user_email = current_user["user_email"]

    user = users_collection.find_one(
        {"user_email": user_email},
        {"weight_kg": 1, "date_of_birth": 1, "targets": 1}
    )

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    age = calculate_age(user["date_of_birth"])
    weight = user["weight_kg"]

    # -----------------------
    # Extract diet save tag
    # -----------------------
    diet_date, clean_prompt = extract_save_diet_tag(prompt)
    should_save_diet = diet_date is not None

    # -----------------------
    # Decide prompt type
    # -----------------------
    if is_meal_log(clean_prompt):
        system_prompt = build_meal_prompt(clean_prompt, diet_date)
    else:
        if "set target" in clean_prompt.lower() or "nutrition target" in clean_prompt.lower():
            activity_type = "gym" if "gym" in clean_prompt.lower() else "no_gym"
            system_prompt = build_target_prompt(age, weight, activity_type)
        else:
            # Normal conversational prompt
            system_prompt = f"""
You are a fitness assistant.
Answer the user's question clearly and helpfully.
User input:
{clean_prompt}
"""

    # -----------------------
    # Call Gemini
    # -----------------------
    gemini_response = model.generate_content(system_prompt)
    ai_text = gemini_response.text

    if not ai_text:
        raise HTTPException(status_code=500, detail="Empty AI response")

    parsed = extract_json_block(ai_text)
    clean_text = remove_json_block(ai_text)


    # -----------------------
    # Save targets (ONLY in users)
    # -----------------------
    if parsed and "targets" in parsed:
        users_collection.update_one(
            {"user_email": user_email},
            {
                "$set": {
                    "targets": parsed["targets"],
                    "updated_at": datetime.utcnow()
                }
            }
        )

    # -----------------------
    # Save nutrition history ONLY if button was pressed
    # -----------------------
    if should_save_diet and parsed and "consumed" in parsed and "foods" in parsed:
        # Check if history already exists for this date
        history_dt = datetime.combine(date.fromisoformat(diet_date), time.min)
        existing = nutrition_history_collection.find_one({
            "user_email": user_email,
            "date": history_dt
        })

        if existing:
            # Diet already recorded
            clean_text = f"⚠️ **Diet for {diet_date} was already recorded.**\n\nHere's what you had:\n\n{clean_text}"
        else:
            # Save the diet
            buffered_consumed = apply_buffer(parsed["consumed"])
            save_or_update_history(
                user_email=user_email,
                payload=SaveHistoryRequest(
                    date=date.fromisoformat(diet_date),
                    consumed=buffered_consumed,
                    targets={},
                    foods=parsed["foods"]
                )
            )

    # -----------------------
    # Save chat (use original prompt for history)
    # -----------------------
    message = {
        "question": prompt,  # Save with tag for context
        "answer": clean_text,
        "created_at": datetime.utcnow()
    }

    if first:
        ai_conversations_collection.insert_one({
            "user_email": user_email,
            "messages": [message],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    else:
        ai_conversations_collection.update_one(
            {"user_email": user_email},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    return {"response": clean_text}


@ai_router.delete("/delete")
def delete_chat(current_user=Depends(get_current_user)):
    result = ai_conversations_collection.delete_one(
        {"user_email": current_user["user_email"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat does not exist")
    return {"message": "Chat deleted successfully"}


@ai_router.get("/history")
def get_chat_history(current_user=Depends(get_current_user)):
    chat = ai_conversations_collection.find_one(
        {"user_email": current_user["user_email"]},
        {"_id": 0}
    )

    if not chat:
        raise HTTPException(status_code=404, detail="Chat does not exist")

    return {
        "user_email": chat["user_email"],
        "total_messages": len(chat.get("messages", [])),
        "messages": chat.get("messages", [])
    }