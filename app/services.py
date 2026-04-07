import random
import json
import math
import threading
import time
from copy import deepcopy
from datetime import datetime, timedelta, time as dt_time
from app.config import ADMIN_ROD, RodKeyWords, ROD_PROPERTIES, FISHING_ROD_BASES, FISHING_ROD_BASES_WEIGHTS, ACHIEVEMENT_RULES, ROD_NAMES, FISH_PREFIXES, FISH_SUFFIXES, ACHIEVEMENTS_LIST, FISHES_DAY, FISHES_NIGHT, MISC
from app import database
from app.fish_naming import format_fish_name

_server_state_lock = threading.Lock()
_server_state = {
    "started_at_real_monotonic": None,
    "start_server_datetime": None,
    "current_server_datetime": None,
    "time_of_day": "day",
    "fish_pool": [*FISHES_DAY, *MISC],
    "pool_version": 1,
}


def _parse_server_time_start() -> dt_time:
    raw_value = _get_config().SERVER_TIME_START
    try:
        parts = [int(part) for part in raw_value.split(":")]
        if len(parts) == 2:
            hour, minute = parts
            second = 0
        elif len(parts) == 3:
            hour, minute, second = parts
        else:
            raise ValueError("Invalid time format")
        return dt_time(hour=hour % 24, minute=minute % 60, second=second % 60)
    except (TypeError, ValueError):
        return dt_time(hour=9, minute=0, second=0)


def _get_config():
    from app import config
    return config


def _get_time_of_day(server_datetime: datetime) -> str:
    config = _get_config()
    hour = server_datetime.hour
    day_start = config.SERVER_DAY_START_HOUR
    night_start = config.SERVER_NIGHT_START_HOUR

    if day_start == night_start:
        return "day"

    if day_start < night_start:
        return "day" if day_start <= hour < night_start else "night"

    return "night" if night_start <= hour < day_start else "day"


def _build_fish_pool(time_of_day: str) -> list[dict]:
    base_pool = FISHES_DAY if time_of_day == "day" else FISHES_NIGHT
    return [*base_pool, *MISC]


def initialize_server_runtime_state() -> dict:
    config = _get_config()
    start_server_datetime = datetime.combine(datetime.now().date(), _parse_server_time_start())
    time_of_day = _get_time_of_day(start_server_datetime)
    fish_pool = _build_fish_pool(time_of_day)

    with _server_state_lock:
        _server_state["started_at_real_monotonic"] = time.monotonic()
        _server_state["start_server_datetime"] = start_server_datetime
        _server_state["current_server_datetime"] = start_server_datetime
        _server_state["time_of_day"] = time_of_day
        _server_state["fish_pool"] = fish_pool
        _server_state["pool_version"] = 1

    print(
        f"[server-time:init] start={start_server_datetime.strftime('%H:%M:%S')} "
        f"mode={time_of_day} speed={config.SERVER_TIME_MULTIPLIER}x "
        f"pool_size={len(fish_pool)}"
    )
    return get_server_time_data(refresh=False)


def refresh_server_runtime_state() -> dict:
    config = _get_config()

    with _server_state_lock:
        if _server_state["started_at_real_monotonic"] is None or _server_state["start_server_datetime"] is None:
            should_initialize = True
        else:
            should_initialize = False

    if should_initialize:
        return initialize_server_runtime_state()

    with _server_state_lock:
        elapsed_real_seconds = time.monotonic() - _server_state["started_at_real_monotonic"]
        current_server_datetime = _server_state["start_server_datetime"] + timedelta(
            seconds=elapsed_real_seconds * config.SERVER_TIME_MULTIPLIER
        )
        new_time_of_day = _get_time_of_day(current_server_datetime)
        time_of_day_changed = new_time_of_day != _server_state["time_of_day"]

        _server_state["current_server_datetime"] = current_server_datetime

        if time_of_day_changed:
            _server_state["time_of_day"] = new_time_of_day
            _server_state["fish_pool"] = _build_fish_pool(new_time_of_day)
            _server_state["pool_version"] += 1
            pool_size = len(_server_state["fish_pool"])
        else:
            pool_size = len(_server_state["fish_pool"])

        current_snapshot = {
            "server_datetime": _server_state["current_server_datetime"],
            "time_of_day": _server_state["time_of_day"],
            "pool_version": _server_state["pool_version"],
            "pool_size": pool_size,
        }

    if time_of_day_changed:
        print(
            f"[server-time:switch] time={current_snapshot['server_datetime'].strftime('%H:%M:%S')} "
            f"mode={current_snapshot['time_of_day']} pool_version={current_snapshot['pool_version']} "
            f"pool_size={current_snapshot['pool_size']}"
        )

    return get_server_time_data(refresh=False)


def get_current_fish_pool() -> list[dict]:
    refresh_server_runtime_state()
    with _server_state_lock:
        return list(_server_state["fish_pool"])


def get_server_time_data(refresh: bool = True) -> dict:
    if refresh:
        refresh_server_runtime_state()

    config = _get_config()
    with _server_state_lock:
        current_server_datetime = _server_state["current_server_datetime"]
        time_of_day = _server_state["time_of_day"]
        pool_size = len(_server_state["fish_pool"])
        pool_version = _server_state["pool_version"]

    if current_server_datetime is None:
        current_server_datetime = datetime.combine(datetime.now().date(), _parse_server_time_start())
        time_of_day = _get_time_of_day(current_server_datetime)
        pool_size = len(_build_fish_pool(time_of_day))
        pool_version = 1

    return {
        "server_time": current_server_datetime.strftime("%H:%M:%S"),
        "server_timestamp": current_server_datetime.isoformat(),
        "time_of_day": time_of_day,
        "multiplier": config.SERVER_TIME_MULTIPLIER,
        "update_interval_seconds": config.SERVER_TIME_UPDATE_INTERVAL_SECONDS,
        "pool_size": pool_size,
        "pool_version": pool_version,
    }


def get_rod_properties(rod: dict) -> dict:
    """Возвращает свойства удочки в виде словаря."""
    if isinstance(rod.get('properties'), str):
        try:
            return json.loads(rod['properties'])
        except (TypeError, ValueError, json.JSONDecodeError):
            return {}
    return rod.get('properties', {}) or {}


def roll_fish_parts(luck_bonus: float = 0.0, fish_pool: list[dict] | None = None):
    """
    выбирает базовую рыбу, префикс и суффикс с учетом лак бонуса
    """
    def pick_with_luck(items, weight_key: str = "rarity_weight"):
        if not items:
            raise ValueError("Items list is empty")

        base_weights = [max(float(item.get(weight_key, 1)), 0.1) for item in items]
        max_weight = max(base_weights)
        adjusted_weights = []

        for base_weight in base_weights:
            adjusted_weight = base_weight
            if luck_bonus > 0 and max_weight > 0:
                rarity_boost = max(math.sqrt(max_weight / base_weight) - 1.0, 0.0)
                adjusted_weight = max(base_weight * (1 + luck_bonus * rarity_boost), 0.001)
            adjusted_weights.append(adjusted_weight)

        selected_index = random.choices(range(len(items)), weights=adjusted_weights, k=1)[0]
        return {
            "item": items[selected_index],
            "base_weight": base_weights[selected_index],
            "adjusted_weight": adjusted_weights[selected_index],
        }

    active_fish_pool = fish_pool or get_current_fish_pool()
    fish_roll = pick_with_luck(active_fish_pool)
    prefix_roll = pick_with_luck(FISH_PREFIXES)
    suffix_roll = pick_with_luck(FISH_SUFFIXES)

    selected_fish = fish_roll["item"].copy()
    prefix = prefix_roll["item"]
    suffix = suffix_roll["item"]

    roll_debug = {
        "fish": {
            "name": selected_fish["name"],
            "rarity": selected_fish.get("rarity"),
            "base_weight": fish_roll["base_weight"],
            "adjusted_weight": fish_roll["adjusted_weight"],
        },
        "prefix": {
            "name": prefix["name"] or "<empty prefix>",
            "base_weight": prefix_roll["base_weight"],
            "adjusted_weight": prefix_roll["adjusted_weight"],
        },
        "suffix": {
            "name": suffix["name"] or "<empty suffix>",
            "base_weight": suffix_roll["base_weight"],
            "adjusted_weight": suffix_roll["adjusted_weight"],
        },
    }

    return selected_fish, prefix, suffix, roll_debug

def generate_starter_rod(user_id: int): #Работает???
    """Выдает стартовую удочку, если у игрока нет инвентаря"""
    rods = database.get_user_rods(user_id)
    if not rods:
        rod = generate_random_rod()
        rod_id = database.add_rod(user_id, rod)
        database.set_active_rod_db(user_id, rod_id)

def generate_random_rod():
    """
    Генрирует стартовую удочку
    """
 
    properties_count = random.choices(
        [1, 2, 3, 4, 5, 6],
        weights=[600, 300, 150, 80, 40, 15]
    )[0]
    
    available_props = list(ROD_PROPERTIES.keys())
    prop_weights = [ROD_PROPERTIES[p]["rarity_weight"] for p in available_props]
    # print(prop_weights)


    # selected_props = random.sample(available_props, properties_count)
    selected_props = []
    
    for _ in range(min(properties_count, len(available_props))):
    # Выбираем одно свойство, используя наши веса
        choice = random.choices(available_props, weights=prop_weights, k=1)[0]
        selected_props.append(choice)
        
        # Удаляем выбранное свойство и его вес из временных списков
        idx = available_props.index(choice)
        available_props.pop(idx)
        prop_weights.pop(idx)

    # print(f"Выбранные свойства: {selected_props}")

    properties = {}
    total_rarity_weight = 0
    gear_score = 0  
    
    for prop_name in selected_props:
        tiers = ROD_PROPERTIES[prop_name]["tiers"]
        tier_weights = [tiers[i]["rarity_weight"] for i in range(1, 11)]
        tier = random.choices(range(1, 11), weights=tier_weights)[0]
        
        properties[prop_name] = tier
        total_rarity_weight += tier_weights[tier - 1]
        

        tier_data = tiers[tier]
        gs_value = tier_data.get("gs_value", 0)
        gear_score += gs_value

    avg_weight = total_rarity_weight / len(selected_props)

    # База генерируется отдельно от свойств, просто по весу.
    rods_weights = FISHING_ROD_BASES_WEIGHTS
    fish_rod_base = random.choices(range(1, FISHING_ROD_BASES.__len__() + 1), weights=rods_weights)[0]

    rarity = FISHING_ROD_BASES[fish_rod_base]["rarity"]
    durability_range = FISHING_ROD_BASES[fish_rod_base]["durabillity"]

    if RodKeyWords.ROD_DURABILITY_INCREASE in properties:
        tier = properties[RodKeyWords.ROD_DURABILITY_INCREASE]
        durability_bonus = ROD_PROPERTIES[RodKeyWords.ROD_DURABILITY_INCREASE]['tiers'][tier]['value']
    else:
        durability_bonus = 0
    
    if durability_bonus >= 0 :
        durability = random.randrange(durability_range[0], durability_range[1]) + durability_bonus
    else:
        durability = -1
    
    min_damage = FISHING_ROD_BASES[fish_rod_base]["damage"][0]
    max_damage = FISHING_ROD_BASES[fish_rod_base]["damage"][1]

    rod_name = random.choice(ROD_NAMES)

    return {
        "name": rod_name,
        "rarity": rarity,
        "properties": properties,
        "durability": durability,
        "min_damage": min_damage,
        "max_damage": max_damage,
        "gear_score": gear_score
    }


def generate_admin_rod():
    if ADMIN_ROD:
        return deepcopy(ADMIN_ROD)
    return generate_random_rod()

def catch_fish_logic(rod: dict):
    properties = get_rod_properties(rod)
    server_time_data = get_server_time_data()
    current_fish_pool = get_current_fish_pool()
    
    luck_bonus = 0.0
    reward_mult = 1.0
    crit_chance = 0.0
    
    if RodKeyWords.ROD_LUCK_INCREASE in properties:
        tier = properties[RodKeyWords.ROD_LUCK_INCREASE]
        luck_bonus = ROD_PROPERTIES[RodKeyWords.ROD_LUCK_INCREASE]['tiers'][tier]['value']
    
    if RodKeyWords.ROD_REWARD_INCREASE in properties:
        tier = properties[RodKeyWords.ROD_REWARD_INCREASE]
        reward_mult = ROD_PROPERTIES[RodKeyWords.ROD_REWARD_INCREASE]['tiers'][tier]['value']

    if RodKeyWords.ROD_CRIT_CHANCE_INCREASE in properties:
        tier = properties[RodKeyWords.ROD_CRIT_CHANCE_INCREASE]
        crit_chance = ROD_PROPERTIES[RodKeyWords.ROD_CRIT_CHANCE_INCREASE]['tiers'][tier]['value']
    
  

    selected_fish, prefix, suffix, roll_debug = roll_fish_parts(luck_bonus, current_fish_pool)

    full_name = format_fish_name(
        selected_fish["name"],
        prefix.get("name", ""),
        suffix.get("name", "")
    )
    
    base_price = selected_fish["base_price"]
    total_mult = reward_mult * prefix["mult"] * suffix["mult"]
    visual_points = selected_fish.get("visual_points", 0)
    display_score = total_mult + visual_points


    final_reward = int(base_price * total_mult)
    is_crit = random.random() < crit_chance
    if is_crit:
        final_reward = int(final_reward * 2.5)  # Крит наносит 2.5x урона

    print(
        f"[server-time] time={server_time_data['server_time']} "
        f"mode={server_time_data['time_of_day']} "
        f"pool_version={server_time_data['pool_version']} "
        f"pool_size={server_time_data['pool_size']} "
        f"[catch-roll] luck_bonus={luck_bonus} "
        f"fish={roll_debug['fish']['name']}({roll_debug['fish']['rarity']}) "
        f"fish_base_weight={roll_debug['fish']['base_weight']:.3f} "
        f"fish_adjusted_weight={roll_debug['fish']['adjusted_weight']:.3f} "
        f"prefix={roll_debug['prefix']['name']} "
        f"prefix_base_weight={roll_debug['prefix']['base_weight']:.3f} "
        f"prefix_adjusted_weight={roll_debug['prefix']['adjusted_weight']:.3f} "
        f"suffix={roll_debug['suffix']['name']} "
        f"suffix_base_weight={roll_debug['suffix']['base_weight']:.3f} "
        f"suffix_adjusted_weight={roll_debug['suffix']['adjusted_weight']:.3f}"
    )
# Поменять надо на что-то умное
    if display_score >= 100:
        display_rarity = "mythic"
    elif display_score >= 50:
        display_rarity = "legendary"
    elif display_score >= 15:
        display_rarity = "epic"
    elif display_score >= 5:
        display_rarity = "rare"
    elif display_score > 1:
        display_rarity = "uncommon"
    else:
        display_rarity = "common"

    # Передаем данные
    selected_fish["name"] = full_name
    selected_fish["prefix_data"] = prefix
    selected_fish["suffix_data"] = suffix
    selected_fish["display_rarity"] = display_rarity
    selected_fish["visual_points"] = visual_points
    selected_fish["display_score"] = display_score
    selected_fish["is_crit"] = is_crit
    selected_fish["color"] = selected_fish.get("color", "normal")
    selected_fish["server_time"] = server_time_data["server_time"]
    selected_fish["time_of_day"] = server_time_data["time_of_day"]
    selected_fish["fish_pool_version"] = server_time_data["pool_version"]
    
    # Проверяем, будет ли рыба поймана автоматически
    # Если HP рыбы <= среднему урону удочки, рыба ловится без боя
    fish_hp = calculate_fish_hp(selected_fish, rod)
    avg_damage = (rod.get('min_damage', 1) + rod.get('max_damage', 3)) / 2
    
    # Учитываем power множитель в среднем урону
    power_mult = 1.0
    if RodKeyWords.ROD_POWER_INCREASE in properties:
        try:
            tier = int(properties[RodKeyWords.ROD_POWER_INCREASE])
            power_mult = ROD_PROPERTIES[RodKeyWords.ROD_POWER_INCREASE]['tiers'][tier]['value']
        except (ValueError, KeyError, TypeError):
            power_mult = 1.0
    
    avg_damage = avg_damage * power_mult
    
    # Добавляем бонус от piercing свойства
    piercing_bonus = 0.0
    if 'piercing' in properties:
        try:
            tier = properties['piercing']
            piercing_bonus = ROD_PROPERTIES['piercing']['tiers'][tier]['value']
        except (ValueError, KeyError, TypeError):
            piercing_bonus = 0.0
    
    selected_fish["hp"] = fish_hp
    selected_fish["auto_catch"] = fish_hp <= (avg_damage + piercing_bonus)

    return selected_fish, final_reward





# Чек достижений
def strike_fish_logic(user_id: int, current_fish: dict):
    """
    Серверная логика удара по рыбе.
    Важные данные боя и поимки считаются на сервере, а не на фронтенде.
    """
    if not user_id:
        raise ValueError("Не указан user_id")

    fish_state = current_fish.get(user_id)
    if not fish_state:
        raise ValueError("Нет активной рыбы для боя")

    damage = calculate_strike_damage(fish_state["active_rod"])
    fish_state["hp"] = max(0, fish_state["hp"] - damage)
    is_alive = fish_state["hp"] > 0

    response = {
        "damage": damage,
        "hp": fish_state["hp"],
        "max_hp": fish_state["max_hp"],
        "is_alive": is_alive,
    }

    if is_alive:
        return response

    reward = fish_state["reward"]
    new_balance = database.update_balance(user_id, reward)
    database.update_max_catch(user_id, reward)
    database.increment_total_caught(user_id)

    response["reward"] = reward
    response["balance"] = new_balance
    response["new_achievements"] = check_and_unlock_achievements(user_id) or []

    del current_fish[user_id]
    return response


def check_and_unlock_achievements(user_id: int):
    stats = database.get_player_stats(user_id)
    rods = database.get_user_rods(user_id)
    
    stats['rods_count'] = len(rods)
    unlocked_already = database.get_unlocked_achievements(user_id)
    
    new_unlocks = []
    
    for key, condition in ACHIEVEMENT_RULES.items():
        if key not in unlocked_already:
            if condition(stats):
                database.unlock_achievement_db(user_id, key)
                achievement_data = ACHIEVEMENTS_LIST.get(key, {})
                new_unlocks.append({
                    "key": key,
                    "name": achievement_data.get("name", "Неизвестное достижение"),
                    "desc": achievement_data.get("desc", "")
                })
                
    return new_unlocks


def get_achievement_progress(stats: dict, achievement_key: str, target: int) -> dict:
    safe_target = max(int(target or 1), 1)

    if achievement_key == 'first_fish' or achievement_key.startswith('big_fish'):
        current_value = int(stats.get('total_caught', 0) or 0)
        unit = 'рыб'
    elif achievement_key.startswith('rich_man'):
        current_value = int(stats.get('balance', 0) or 0)
        unit = 'монет'
    elif achievement_key.startswith('collector'):
        current_value = int(stats.get('rods_count', 0) or 0)
        unit = 'удочек'
    else:
        current_value = 0
        unit = ''

    current_value = max(current_value, 0)
    progress_percent = min(100, round((current_value / safe_target) * 100))

    return {
        "current": current_value,
        "target": safe_target,
        "percent": progress_percent,
        "unit": unit
    }


def calculate_fish_hp(fish_data: dict, rod: dict):
    """
    Рассчитывает HP рыбы простой формулой:
    HP = base_hp × hp_mult_префикса × hp_mult_суффикса
    """
    try:
        # Получаем базовый HP из данных рыбы
        base_hp = fish_data.get("base_hp", 10)
        
        # Получаем множители из префикса и суффикса
        prefix_data = fish_data.get("prefix_data", {})
        suffix_data = fish_data.get("suffix_data", {})
        
        prefix_hp_mult = prefix_data.get("hp_mult", 1.0)
        suffix_hp_mult = suffix_data.get("hp_mult", 1.0)
        
        # HP = база × множитель префикса × множитель суффикса
        hp = int(base_hp * prefix_hp_mult * suffix_hp_mult)
        
        return max(1, hp)  # Минимум 1 HP
    except Exception as e:
        print(f"Ошибка в calculate_fish_hp: {e}")
        import traceback
        traceback.print_exc()
        return 10  # Дефолтное HP если что-то сломалось


def calculate_strike_damage(rod: dict):
    """
    Рассчитывает урон за один удар
    Зависит от базового диапазона удочки (min_damage, max_damage) и свойств
    """
    try:
        # Парсим свойства
        properties = get_rod_properties(rod)
        
        # Получаем базовый диапазон из удочки
        min_damage = rod.get('min_damage', 1)
        max_damage = rod.get('max_damage', 3)
        
        damage_range = range(min_damage, max_damage + 1)
        weights = []
        for dmg in damage_range:
            relative_pos = (dmg - min_damage) / max(1, (max_damage - min_damage))
            weight = (1 - relative_pos * 0.7) ** 2  # 70% падение от начала к концу
            weights.append(max(1, weight))  # Минимум 1 чтобы не было 0
        
        base_damage = random.choices(list(damage_range), weights=weights)[0]

        # MARK: КАКОВА ХУЙЯ Множитель награды влияет на урон
        reward_mult = 1.0
        if 'reward' in properties:
            try:
                tier = int(properties['reward'])
                tier_data = ROD_PROPERTIES['reward']['tiers'].get(tier, {})
                reward_mult = tier_data.get('value', 1.0) / 2.0 
            except (ValueError, KeyError, TypeError) as e:
                print(f"Ошибка при обработке reward в damage: {e}")
        
        # MARK: КАКОВА ХУЙЯ крит вообще так нахуй работает что это блять
        crit_bonus = 1
        if RodKeyWords.ROD_CRIT_CHANCE_INCREASE in properties:
            try:
                tier = int(properties[RodKeyWords.ROD_CRIT_CHANCE_INCREASE])
                tier_data = ROD_PROPERTIES[RodKeyWords.ROD_CRIT_CHANCE_INCREASE]['tiers'].get(tier, {})
                crit_chance = tier_data.get('value', 0.0)
                if random.random() < crit_chance:
                    # crit_bonus = random.randint(1, 3) 
                    crit_bonus = 1.5
                    # MARK: МОЖНО ДОБАВИТЬ СВОЙСТВА УСИЛЕНИЯ КРИТА 
                    # ИЛИ ПРОСТО БРАТЬ КРИТ МУЛЬТИ ОТ ТИРА ТОЖЕ, 
                    # НО БУДЕТ ДАБЛ ДИП И БУДЕТ УЖЕ ПИЗДЕЦ МОЩНОЕ СВОЙСТВ
            except (ValueError, KeyError, TypeError) as e:
                print(f"Ошибка при обработке " +RodKeyWords.ROD_CRIT_CHANCE_INCREASE + " в damage: {e}")
        
        
        power_mult = 1.0
        if RodKeyWords.ROD_POWER_INCREASE in properties:
            try:
                tier = int(properties[RodKeyWords.ROD_POWER_INCREASE])
                tier_data = ROD_PROPERTIES[RodKeyWords.ROD_POWER_INCREASE]['tiers'].get(tier, {})
                power_mult = tier_data.get('value', 1.0)
            except (ValueError, KeyError, TypeError) as e:
                print(f"Ошибка при обработке " + RodKeyWords.ROD_POWER_INCREASE + " в damage: {e}")
        
        # damage = int(base_damage * reward_mult * power_mult) + crit_bonus
        damage = max(1, int(base_damage * power_mult * crit_bonus))

        print(
            f"[strike] rod_id={rod.get('id')} "
            f"user_id={rod.get('user_id')} "
            f"properties={properties} "
            f"min_damage={min_damage} "
            f"max_damage={max_damage} "
            f"damage={damage}"
        )

        return damage
    except Exception as e:
        print(f"Ошибка в calculate_strike_damage: {e}")
        import traceback
        traceback.print_exc()
        return 1 


def upgrade_rod(rod_id: int, user_id: int):
    """
    Улучшает удочку 
    """
    from app.config import ROD_UPGRADE_SYSTEM
    
    rod = database.get_rod_by_id(rod_id)
    
    if not rod or rod['user_id'] != user_id:
        raise ValueError("Удочка не найдена")
    
    current_level = rod.get('upgrade_level', 0)
    
    if current_level >= 10:
        raise ValueError("Удочка уже максимально улучшена (уровень 10)")
    
    next_level = current_level + 1
    upgrade_data = ROD_UPGRADE_SYSTEM[next_level]
    
    player = database.get_player(user_id, "")
    balance = player.get('balance', 0) or 0
    
    if balance < upgrade_data['cost']:
        raise ValueError(f"Недостаточно монет. Требуется: {upgrade_data['cost']}, у вас: {balance}")
    
    success_chance = upgrade_data['success_chance']
    is_success = random.random() * 100 < success_chance
    
    new_balance = database.update_balance(user_id, -upgrade_data['cost'])
    
    result = {
        "success": is_success,
        "level": next_level if is_success else current_level,
        "cost": upgrade_data['cost'],
        "balance": new_balance
    }
    
    if is_success:
        damage_bonus = upgrade_data['damage_bonus']
        database.update_rod_upgrade(rod_id, next_level, damage_bonus)
        
        result["message"] = f"✅ Успех! Удочка улучшена до уровня {next_level}. Урон +{damage_bonus}"
        result["damage_bonus"] = damage_bonus
    else:
        result["message"] = f"❌ Ошибка улучшения! Монеты потрачены, удочка не изменилась"
        result["fail_chance"] = 100 - success_chance
    
    return result





    
    
