# Валидация входящих запросов и формирование ответов с помощью Pydantic

from pydantic import BaseModel
from typing import Optional, Dict, Any

class UserLogin(BaseModel):
    id: int
    first_name: str = "Guest"
    username: Optional[str] = None

class RodModel(BaseModel):
    id: int
    name: str
    rarity: str
    properties: Dict[str, int]  # Словарь с свойствами и их тирами
    is_active: bool = False

class FishResult(BaseModel):
    fish_name: str
    emoji: str
    rarity: str
    reward: int
    balance: int