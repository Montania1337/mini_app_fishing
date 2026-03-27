# main.py
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app import database, services, config
from app.models import UserLogin, FishResult
import traceback

app = FastAPI()


current_fish = {}

# Инициализация БД при старте
try:
    database.init_db()
    print("База данных успешно инициализирована")
except Exception as e:
    print(f"Ошибка при инициализации БД: {e}")
    traceback.print_exc()

# Подключаем статику
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/api/constants")
async def get_constants():
    """Возвращает константы игры (названия свойств, описания, значения)"""
    return {
        "ROD_PROPERTY_NAMES": config.ROD_PROPERTY_NAMES,
        "ROD_PROPERTY_DESCRIPTIONS": config.ROD_PROPERTY_DESCRIPTIONS,
        "ROD_PROPERTY_VALUES": config.ROD_PROPERTY_VALUES,
        "ROD_UPGRADE_SYSTEM": config.ROD_UPGRADE_SYSTEM,
        "FISHES": config.FISHES,
        "RARITIES": config.RARITIES,
        "FISH_PREFIXES": config.FISH_PREFIXES,
        "FISH_SUFFIXES": config.FISH_SUFFIXES,
    }

@app.post("/api/login")
async def login(payload: dict):
    try:
        user_id = payload.get("id")
        first_name = payload.get("first_name", "Guest")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Не указан user_id")
        
        # Убеждаемся что у юзера есть стартовая удочка
        player = database.get_player(user_id, first_name)
        services.generate_starter_rod(user_id)
        rods = database.get_user_rods(user_id)
        
        active_rod = next((r for r in rods if r['is_active']), None)
        
        return {
            "balance": player['balance'],
            "rods": rods,
            "active_rod": active_rod,
            "rod_price": config.ROD_PRICE,
            "inventory_size": config.INVENTORY_SIZE
        }
    except Exception as e:
        print(f"❌ Ошибка в /api/login: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fish")
async def fish(payload: dict):
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Не указан user_id")
        
    rods = database.get_user_rods(user_id)
    active_rod = next((r for r in rods if r['is_active']), None)
    if not active_rod:
        raise HTTPException(status_code=400, detail="Нет активной удочки")
    
    # 1. Логика улова (генерируем рыбу)
    fish_data, reward = services.catch_fish_logic(active_rod)
    
    # 2. Рассчитываем HP рыбы
    fish_hp = services.calculate_fish_hp(fish_data, active_rod)
    
    # 3. Сохраняем текущую рыбу в памяти
    current_fish[user_id] = {
        "fish_data": fish_data,
        "hp": fish_hp,
        "max_hp": fish_hp,
        "reward": reward,
        "active_rod": active_rod
    }
    
    # 4. Уменьшаем прочность удочки
    durability_result = database.reduce_durability(active_rod['id'])
    is_broken = (durability_result["status"] == "broken")
    durability_left = durability_result["durability"]

    return {
        "fish_name": fish_data["name"],
        "emoji": fish_data["emoji"],
        "rarity": fish_data["rarity"],
        "hp": fish_hp,
        "max_hp": fish_hp,
        "display_rarity": fish_data["display_rarity"],
        "durability_left": durability_left,
        "is_broken": is_broken,
        "is_crit": fish_data.get("is_crit", False),
        "auto_catch": fish_data.get("auto_catch", False)
    }


@app.post("/api/strike-fish")
async def strike_fish(payload: dict):
    """Наносим удар по рыбе"""
    try:
        user_id = payload.get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Не указан user_id")
            
        if user_id not in current_fish:
            raise HTTPException(status_code=400, detail="Нет активной рыбы для боя")
        
        fish_state = current_fish[user_id]
        rod = fish_state["active_rod"]
        fish_data = fish_state["fish_data"]
        
        damage = services.calculate_strike_damage(rod)
        
        fish_state["hp"] -= damage

        is_alive = fish_state["hp"] > 0
        
        response = {
            "damage": damage,
            "hp": max(0, fish_state["hp"]),
            "max_hp": fish_state["max_hp"],
            "is_alive": is_alive,
        }
        

        if not is_alive:
            reward = fish_state["reward"]
            
            # Обновляем баланс
            new_balance = database.update_balance(user_id, reward)
            
            # Обновляем статистику
            database.update_max_catch(user_id, reward)
            database.increment_total_caught(user_id)
            
            # Проверяем достижения
            new_achievements = services.check_and_unlock_achievements(user_id)
            
            response["reward"] = reward
            response["balance"] = new_balance
            response["new_achievements"] = new_achievements if new_achievements else []
            
            # Удаляем рыбу из памяти
            del current_fish[user_id]
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка в strike_fish: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка при ударе: {str(e)}")


@app.post("/api/buy-rod")
async def buy_rod(payload: dict):
    try:
        user_id = payload.get("id")
        first_name = payload.get("first_name", "Guest")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Не указан user_id")
        
        player = database.get_player(user_id, first_name)
        balance = player.get('balance', 0) or 0
        
        # Проверка баланса
        if balance < config.ROD_PRICE:
            raise HTTPException(status_code=400, detail="Недостаточно монет")
        
        # Проверка лимита инвентаря
        rods = database.get_user_rods(user_id)
        if len(rods) >= config.INVENTORY_SIZE:
            raise HTTPException(status_code=400, detail=f"Инвентарь полон! Максимум {config.INVENTORY_SIZE} удочек")
            
        new_balance = database.update_balance(user_id, -config.ROD_PRICE)
        
        new_rod = services.generate_random_rod()
        rod_id = database.add_rod(user_id, new_rod)
        
        new_rod['id'] = rod_id
        new_rod['is_active'] = True
        
        return {
            "success": True,
            "rod": new_rod,
            "balance": new_balance
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в /api/buy-rod: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/set-active")
async def set_active(payload: dict):
    user_id = payload.get("id")
    rod_id = payload.get("rod_id")
    database.set_active_rod_db(user_id, rod_id)
    return {"success": True}

@app.post("/api/delete-rod")
async def delete_rod(payload: dict):
    user_id = payload.get("id")
    rod_id = payload.get("rod_id")
    database.delete_rod_db(user_id, rod_id)
    return {"success": True}

@app.post("/api/delete-rods-below-gs")
async def delete_rods_below_gs(payload: dict):
    user_id = payload.get("id")
    min_gear_score = payload.get("min_gear_score")

    if not user_id:
        raise HTTPException(status_code=400, detail="Не указан user_id")
    if min_gear_score is None:
        raise HTTPException(status_code=400, detail="Не указан порог gear score")

    try:
        min_gear_score = int(min_gear_score)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Порог gear score должен быть числом")

    if min_gear_score < 0:
        raise HTTPException(status_code=400, detail="Порог gear score не может быть отрицательным")

    deleted_count = database.delete_rods_below_gear_score_db(user_id, min_gear_score)
    return {"success": True, "deleted_count": deleted_count, "min_gear_score": min_gear_score}


@app.post("/api/auction/listings")
async def get_auction_listings(payload: dict):
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="РќРµ СѓРєР°Р·Р°РЅ user_id")

    return {
        "listings": database.get_auction_listings(),
        "my_listings": database.get_user_auction_listings(user_id)
    }


@app.post("/api/auction/sell")
async def create_auction_listing(payload: dict):
    try:
        user_id = payload.get("id")
        first_name = payload.get("first_name", "Рыбак")
        rod_id = payload.get("rod_id")
        price = int(payload.get("price", 0))

        if not user_id or not rod_id:
            raise HTTPException(status_code=400, detail="РќРµ СѓРєР°Р·Р°РЅС‹ id РёР»Рё rod_id")

        player = database.get_player(user_id, first_name)
        result = database.create_auction_listing(
            user_id=user_id,
            rod_id=rod_id,
            price=price,
            seller_name=player.get("username") or first_name or "Рыбак"
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка в /api/auction/sell: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auction/cancel")
async def cancel_auction_listing(payload: dict):
    try:
        user_id = payload.get("id")
        listing_id = payload.get("listing_id")
        if not user_id or not listing_id:
            raise HTTPException(status_code=400, detail="РќРµ СѓРєР°Р·Р°РЅС‹ id РёР»Рё listing_id")

        success = database.cancel_auction_listing(user_id, listing_id)
        if not success:
            raise HTTPException(status_code=404, detail="Лот не найден или уже снят")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка в /api/auction/cancel: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auction/buy")
async def buy_auction_listing(payload: dict):
    try:
        user_id = payload.get("id")
        listing_id = payload.get("listing_id")
        if not user_id or not listing_id:
            raise HTTPException(status_code=400, detail="РќРµ СѓРєР°Р·Р°РЅС‹ id РёР»Рё listing_id")

        result = database.buy_auction_listing(
            buyer_id=user_id,
            listing_id=listing_id,
            inventory_limit=config.INVENTORY_SIZE
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка в /api/auction/buy: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upgrade-rod")
async def upgrade_rod(payload: dict):
    try:
        user_id = payload.get("id")
        rod_id = payload.get("rod_id")
        
        if not user_id or not rod_id:
            raise HTTPException(status_code=400, detail="Не указаны id или rod_id")
        
        result = services.upgrade_rod(rod_id, user_id)
        
        # Получаем данные удочки (как успешно так и при неудаче)
        updated_rod = database.get_rod_by_id(rod_id)

        min_damage = int(updated_rod.get('min_damage', 1))
        max_damage = int(updated_rod.get('max_damage', 3))
        
        power = 1.0
        properties = updated_rod.get('properties')
        if properties:
            if isinstance(properties, str):
                import json
                properties = json.loads(properties)
            if isinstance(properties, dict) and config.GlobalKeyWords.ROD_POWER_INCREASE in properties:
                tier = properties[config.GlobalKeyWords.ROD_POWER_INCREASE]
                power_values = {tier: tier_data["value"] for tier, tier_data in config.ROD_PROPERTIES[config.GlobalKeyWords.ROD_POWER_INCREASE]["tiers"].items()}
            # if isinstance(properties, dict) and 'rod_power_increase' in properties:
                # tier = properties['rod_power_increase']
                # power_values = {tier: tier_data["value"] for tier, tier_data in config.ROD_PROPERTIES["rod_power_increase"]["tiers"].items()}
                print(power_values)
                
                # power_values = {1: 1.05, 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.5, 6: 1.7, 7: 2.0, 8: 2.5, 9: 3.0, 10: 4.0}
                power = power_values.get(tier, 1.0)
        
        damage_min = int(min_damage * power)
        damage_max = int(max_damage * power)
        
        result['damage_min'] = damage_min
        result['damage_max'] = damage_max
        result['rod'] = updated_rod
        result['balance'] = database.get_player(user_id, "")['balance']
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Ошибка в /api/upgrade-rod: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/swap-rods")
async def swap_rods(payload: dict):
    user_id = payload.get("id")
    from_index = payload.get("from_index")
    to_index = payload.get("to_index")
    
    if from_index is None or to_index is None:
        raise HTTPException(status_code=400, detail="Необходимо указать индексы")
    
    database.swap_rods_by_index(user_id, from_index, to_index)
    return {"success": True}

@app.post("/api/achievements")
async def get_achievements(payload: dict):
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Не указан user_id")

    unlocked = database.get_unlocked_achievements(user_id)
    stats = database.get_player_stats(user_id)
    rods = database.get_user_rods(user_id)
    stats['rods_count'] = len(rods)
    
    # Собираем список для фронтенда
    result = []
    for key, info in config.ACHIEVEMENTS_LIST.items():
        progress = services.get_achievement_progress(stats, key, info.get("target", 1))
        result.append({
            "key": key,
            "name": info["name"],
            "desc": info["desc"],
            "is_unlocked": key in unlocked,
            "progress_current": progress["current"],
            "progress_target": progress["target"],
            "progress_percent": progress["percent"],
            "progress_unit": progress["unit"]
        })
    return result

@app.post("/api/leaderboard")
async def get_leaderboard():
    return {
        "by_balance": database.get_top_by_balance(),
        "by_catch": database.get_top_by_catch(),
        "by_max_catch": database.get_top_by_max_catch()
    }
