from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE = os.getenv("DATABASE_NAME")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env file")

client = MongoClient(MONGODB_URI)

db = client[f'{DATABASE}']

# Collections
users_collection = db["users"]
ai_conversations_collection = db["ai_conversations"]
nutrition_history_collection = db["nutrition_history"]
