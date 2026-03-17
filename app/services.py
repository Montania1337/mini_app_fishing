import random
import json
from app.config import FISHES, RARITIES, ROD_PROPERTIES, ACHIEVEMENT_RULES, ROD_NAMES, FISH_PREFIXES, FISH_SUFFIXES, ACHIEVEMENTS_LIST
from app import database

def weighted_choice(items):
    """Универсальная функция выбора с весами"""
    total = sum(RARITIES[i["rarity"]]["chance"] for i in items)
    r = random.uniform(0, total)
    upto = 0
    for item in items:
        upto += RARITIES[item["rarity"]]["chance"]
        if upto >= r:
            return item
    return items[0]

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
    selected_props = random.sample(available_props, properties_count)
    
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
    
    if avg_weight > 700:
        rarity = "common"
        durability = random.randint(50, 150)
        # Базовый урон для Common: 1-3
        min_damage = 1
        max_damage = 3
    elif avg_weight > 500:
        rarity = "uncommon"
        durability = random.randint(150, 300)
        min_damage = 2
        max_damage = 5
    elif avg_weight > 300:
        rarity = "rare"
        durability = random.randint(300, 600)
        min_damage = 3
        max_damage = 7
    elif avg_weight > 100:
        rarity = "epic"
        durability = random.randint(600, 1000)
        min_damage = 4
        max_damage = 10
    else:
        rarity = "legendary"
        durability = random.randint(1000, 2000)
        min_damage = 5
        max_damage = 15
    
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



def get_random_modifier(modifiers):
    total = sum(m["rarity_weight"] for m in modifiers)
    r = random.uniform(0, total)
    upto = 0
    for m in modifiers:
        upto += m["rarity_weight"]
        if upto >= r:
            return m
    return modifiers[0]

def catch_fish_logic(rod: dict):
    properties = {}
    if isinstance(rod.get('properties'), str):
        try:
            properties = json.loads(rod['properties'])
        except:
            properties = {}
    else:
        properties = rod.get('properties', {})
    
    luck_bonus = 0.0
    reward_mult = 1.0
    crit_chance = 0.0
    
    if 'luck' in properties:
        tier = properties['luck']
        luck_bonus = ROD_PROPERTIES['luck']['tiers'][tier]['value']
    
    if 'reward' in properties:
        tier = properties['reward']
        reward_mult = ROD_PROPERTIES['reward']['tiers'][tier]['value']

    if 'crit' in properties:
        tier = properties['crit']
        crit_chance = ROD_PROPERTIES['crit']['tiers'][tier]['value']
    
    pool = []
    for fish in FISHES:
        rarity_data = RARITIES[fish["rarity"]]
        chance = rarity_data["chance"]
        if fish["rarity"] in ["rare", "epic", "legendary"]:
            chance *= (1 + luck_bonus)
        pool.append({**fish, "calc_chance": chance})
        
    total_chance = sum(x["calc_chance"] for x in pool)
    r = random.uniform(0, total_chance)
    upto = 0
    selected_fish = pool[0]
    for item in pool:
        upto += item["calc_chance"]
        if upto >= r:
            selected_fish = item.copy()
            break

    prefix = get_random_modifier(FISH_PREFIXES)
    suffix = get_random_modifier(FISH_SUFFIXES)

    s_name = f" {suffix['name']}" if suffix['name'] else ""
    full_name = f"{prefix['name']} {selected_fish['name']}{s_name}".strip()
    
    base_price = selected_fish["base_price"]
    rarity_mult = RARITIES[selected_fish["rarity"]]["mult"]
    

    total_mult = rarity_mult * reward_mult * prefix["mult"] * suffix["mult"]
    

    final_reward = int(base_price * total_mult)
    is_crit = random.random() < crit_chance
    if is_crit:
        final_reward = int(final_reward * 2.5)  # Крит наносит 2.5x урона

    if total_mult >= 50:
        display_rarity = "mythic"
    elif total_mult >= 15:
        display_rarity = "legendary"
    elif total_mult >= 5:
        display_rarity = "epic"
    elif total_mult >= 2:
        display_rarity = "rare"
    else:
        display_rarity = "common"

    # Передаем данные
    selected_fish["name"] = full_name
    selected_fish["prefix_data"] = prefix
    selected_fish["suffix_data"] = suffix
    selected_fish["display_rarity"] = display_rarity
    selected_fish["is_crit"] = is_crit
    
    # Проверяем, будет ли рыба поймана автоматически
    # Если HP рыбы <= среднему урону удочки, рыба ловится без боя
    fish_hp = calculate_fish_hp(selected_fish, rod)
    avg_damage = (rod.get('min_damage', 1) + rod.get('max_damage', 3)) / 2
    
    # Учитываем power множитель в среднем урону
    power_mult = 1.0
    if 'power' in properties:
        try:
            tier = int(properties['power'])
            power_mult = ROD_PROPERTIES['power']['tiers'][tier]['value']
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
        properties = {}
        if isinstance(rod.get('properties'), str):
            try:
                properties = json.loads(rod['properties'])
            except:
                properties = {}
        else:
            properties = rod.get('properties', {})
        
        # Получаем базовый диапазон из удочки
        min_damage = rod.get('min_damage', 1)
        max_damage = rod.get('max_damage', 3)
        
        damage_range = range(min_damage, max_damage + 1)
        weights = []
        for i, dmg in enumerate(damage_range):
            relative_pos = (dmg - min_damage) / max(1, (max_damage - min_damage))
            weight = (1 - relative_pos * 0.7) ** 2  # 70% падение от начала к концу
            weights.append(max(1, weight))  # Минимум 1 чтобы не было 0
        
        base_damage = random.choices(list(damage_range), weights=weights)[0]
        
        reward_mult = 1.0
        if 'reward' in properties:
            try:
                tier = int(properties['reward'])
                tier_data = ROD_PROPERTIES['reward']['tiers'].get(tier, {})
                reward_mult = tier_data.get('value', 1.0) / 2.0 
            except (ValueError, KeyError, TypeError) as e:
                print(f"Ошибка при обработке reward в damage: {e}")
        
        crit_bonus = 0
        if 'crit' in properties:
            try:
                tier = int(properties['crit'])
                tier_data = ROD_PROPERTIES['crit']['tiers'].get(tier, {})
                crit_chance = tier_data.get('value', 0.0)
                if random.random() < crit_chance:
                    crit_bonus = random.randint(1, 3) 
            except (ValueError, KeyError, TypeError) as e:
                print(f"Ошибка при обработке crit в damage: {e}")
        
        power_mult = 1.0
        if 'power' in properties:
            try:
                tier = int(properties['power'])
                tier_data = ROD_PROPERTIES['power']['tiers'].get(tier, {})
                power_mult = tier_data.get('value', 1.0)
            except (ValueError, KeyError, TypeError) as e:
                print(f"Ошибка при обработке power в damage: {e}")
        
        damage = int(base_damage * reward_mult * power_mult) + crit_bonus
        
        return max(1, damage)
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





    
    