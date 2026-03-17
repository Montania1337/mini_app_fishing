# app/config.py
#  uvicorn main:app  --port 5000
# Настройки экономики
ROD_PRICE = 1
INVENTORY_SIZE = 20  # Максимальное количество удочек в инвентаре (3 ряда по 4)

ROD_UPGRADE_SYSTEM = {
    1: {"damage_bonus": 1, "cost": 10, "success_chance": 100},    # +1 урон, 100% шанс
    2: {"damage_bonus": 1, "cost": 15, "success_chance": 95},     # +1 урон, 95% шанс
    3: {"damage_bonus": 1, "cost": 20, "success_chance": 90},     # +1 урон, 90% шанс
    4: {"damage_bonus": 1, "cost": 25, "success_chance": 85},     # +1 урон, 85% шанс
    5: {"damage_bonus": 2, "cost": 30, "success_chance": 80},     # +2 урона, 80% шанс
    6: {"damage_bonus": 2, "cost": 40, "success_chance": 70},     # +2 урона, 70% шанс
    7: {"damage_bonus": 2, "cost": 50, "success_chance": 60},     # +2 урона, 60% шанс
    8: {"damage_bonus": 3, "cost": 60, "success_chance": 50},     # +3 урона, 50% шанс
    9: {"damage_bonus": 3, "cost": 80, "success_chance": 40},     # +3 урона, 40% шанс
    10: {"damage_bonus": 4, "cost": 100, "success_chance": 30},   # +4 урона, 30% шанс
}

# Редкости 
RARITIES = {
    "common":    {"chance": 60, "mult": 1.0, "label": "Обычная", "color": "#bdc3c7"},
    "uncommon":  {"chance": 25, "mult": 1.3, "label": "Необычная", "color": "#2ecc71"},
    "rare":      {"chance": 10, "mult": 1.8, "label": "Редкая", "color": "#3498db"},
    "epic":      {"chance": 4,  "mult": 2.5, "label": "Эпическая", "color": "#9b59b6"},
    "legendary": {"chance": 1,  "mult": 5.0, "label": "Легендарная", "color": "#f1c40f"},
}



# Свойства для увеличения дохода
INCOME_PROPERTIES = {
    "reward": {
        "name": "💰 Множитель награды",
        "description": "Увеличивает количество монет, получаемых за улов",
        "tiers": {
            1: {"value": 1.0, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 1.2, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 1.4, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 1.7, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 2.0, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 2.5, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 3.2, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 4.0, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 5.5, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 8.0, "rarity_weight": 3, "gs_value": 32},
        }
    },
    "xp": {
        "name": "✨ Опыт",
        "description": "Увеличивает количество опыта за улов",
        "tiers": {
            1: {"value": 1.0, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 1.1, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 1.2, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 1.4, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 1.7, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 2.0, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 2.5, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 3.2, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 4.0, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 5.5, "rarity_weight": 3, "gs_value": 32},
        }
    },
}

# Боевые свойства
COMBAT_PROPERTIES = {
    "luck": {
        "name": "🍀 Удача (Редкое)",
        "description": "Повышает шанс поймать рыбу редкой редкости",
        "tiers": {
            1: {"value": 0.0, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 0.05, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 0.10, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 0.15, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 0.25, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 0.35, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 0.50, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 0.75, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 1.0, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 1.5, "rarity_weight": 3, "gs_value": 32},
        }
    },
    "speed": {
        "name": "⚡ Скорость",
        "description": "Ускоряет скорость рыбалки (сокращает время между забросами)",
        "tiers": {
            1: {"value": 0.0, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 0.05, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 0.10, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 0.15, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 0.25, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 0.35, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 0.50, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 0.70, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 1.0, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 1.5, "rarity_weight": 3, "gs_value": 32},
        }
    },
    "durability": {
        "name": "🛡️ Прочность",
        "description": "Определяет, сколько раз можно использовать удочку перед поломкой",
        "tiers": {
            1: {"value": 10, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 20, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 35, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 50, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 75, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 100, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 150, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 250, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 500, "rarity_weight": 15, "gs_value": 24},
            10: {"value": -1, "rarity_weight": 3, "gs_value": 32},
        }
    },
    "crit": {
        "name": "💥 Крит-удар",
        "description": "Шанс нанести критический удар и получить 2.5x награду",
        "tiers": {
            1: {"value": 0.0, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 0.02, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 0.05, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 0.08, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 0.12, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 0.17, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 0.25, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 0.35, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 0.50, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 0.75, "rarity_weight": 3, "gs_value": 32},
        }
    },
    "power": {
        "name": "💪 Мощь",
        "description": "Увеличивает урон удочки процентно",
        "tiers": {
            1: {"value": 1.05, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 1.1, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 1.2, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 1.3, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 1.5, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 1.7, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 2.0, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 2.5, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 3.0, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 4.0, "rarity_weight": 3, "gs_value": 32},
        }
    },
    "piercing": {
        "name": "🔓 Пробивание",
        "description": "Увеличивает порог автоловки слабых рыб на X HP",
        "tiers": {
            1: {"value": 0, "rarity_weight": 1000, "gs_value": 1},
            2: {"value": 1, "rarity_weight": 800, "gs_value": 2},
            3: {"value": 2, "rarity_weight": 600, "gs_value": 4},
            4: {"value": 3, "rarity_weight": 400, "gs_value": 6},
            5: {"value": 5, "rarity_weight": 250, "gs_value": 8},
            6: {"value": 8, "rarity_weight": 150, "gs_value": 10},
            7: {"value": 12, "rarity_weight": 80, "gs_value": 14},
            8: {"value": 18, "rarity_weight": 40, "gs_value": 18},
            9: {"value": 25, "rarity_weight": 15, "gs_value": 24},
            10: {"value": 35, "rarity_weight": 3, "gs_value": 32},
        }
    },
}

# Объединённый словарь для совместимости со старым кодом
ROD_PROPERTIES = {**INCOME_PROPERTIES, **COMBAT_PROPERTIES}

# Рыбы
FISHES = [
    {"name": "Карась", "emoji": "🐟", "rarity": "common", "base_price": 5, "base_hp": 10, "rarity_weight": 600},
    {"name": "Окунь", "emoji": "🐠", "rarity": "uncommon", "base_price": 10, "base_hp": 20, "rarity_weight": 250},
    {"name": "Форель", "emoji": "🐡", "rarity": "rare", "base_price": 25, "base_hp": 35, "rarity_weight": 80},
    {"name": "Золотая рыбка", "emoji": "✨", "rarity": "epic", "base_price": 100, "base_hp": 75, "rarity_weight": 15},
    {"name": "Кракен", "emoji": "🦑", "rarity": "legendary", "base_price": 500, "base_hp": 200, "rarity_weight": 3},
]



# Модификаторы качества и размера (Префиксы)
FISH_PREFIXES = [
    # Мелкие 
    {"name": "Крошечная", "mult": 0.4, "hp_mult": 0.3, "rarity_weight": 100},
    {"name": "Хилая", "mult": 0.6, "hp_mult": 0.5, "rarity_weight": 80},
    {"name": "Маленькая", "mult": 0.8, "hp_mult": 0.7, "rarity_weight": 150},
    # Обычные
    {"name": "Средняя", "mult": 1.0, "hp_mult": 1.0, "rarity_weight": 200},
    {"name": " Обычная", "mult": 1.0, "hp_mult": 1.0, "rarity_weight": 200},
    # Хорошие
    {"name": "Упитанная", "mult": 1.3, "hp_mult": 1.3, "rarity_weight": 70},
    {"name": "Жирная", "mult": 1.5, "hp_mult": 1.5, "rarity_weight": 50},
    {"name": "Бодрая", "mult": 1.6, "hp_mult": 1.4, "rarity_weight": 40},
    {"name": "Крупная", "mult": 1.8, "hp_mult": 1.8, "rarity_weight": 30},
    # Эпические
    {"name": "Гигантская", "mult": 2.5, "hp_mult": 2.5, "rarity_weight": 15},
    {"name": "Титаническая", "mult": 3.5, "hp_mult": 3.5, "rarity_weight": 10},
    {"name": "Мифическая", "mult": 5.0, "hp_mult": 5.0, "rarity_weight": 5},
    {"name": "Древняя", "mult": 8.0, "hp_mult": 8.0, "rarity_weight": 3},
    {"name": "Бессмертная", "mult": 15.0, "hp_mult": 15.0, "rarity_weight": 1},
]

# Cуффы рыбы
FISH_SUFFIXES = [
    {"name": "", "mult": 1.0, "hp_mult": 1.0, "rarity_weight": 500}, 
    # Отрицательные / Странные
    {"name": "с тиной", "mult": 0.9, "hp_mult": 0.8, "rarity_weight": 100},
    {"name": "в мусоре", "mult": 0.7, "hp_mult": 0.6, "rarity_weight": 50},
    {"name": "зомби", "mult": 1.2, "hp_mult": 1.5, "rarity_weight": 30},
    {"name": "мутант", "mult": 1.5, "hp_mult": 1.8, "rarity_weight": 20},
    {"name": "радиоактивная", "mult": 2.2, "hp_mult": 2.0, "rarity_weight": 15},
    # Магические / Ценные
    {"name": "из бездны", "mult": 2.5, "hp_mult": 2.8, "rarity_weight": 15},
    {"name": "светящаяся", "mult": 3.0, "hp_mult": 2.5, "rarity_weight": 12},
    {"name": "в короне", "mult": 4.5, "hp_mult": 4.0, "rarity_weight": 8},
    {"name": "хрустальная", "mult": 6.0, "hp_mult": 5.5, "rarity_weight": 5},
    {"name": "из чистого серебра", "mult": 12.0, "hp_mult": 10.0, "rarity_weight": 3},
    {"name": "Чистое Золото", "mult": 25.0, "hp_mult": 22.0, "rarity_weight": 1.5},
    {"name": "Алмазная", "mult": 50.0, "hp_mult": 45.0, "rarity_weight": 0.5},
    {"name": "Админская", "mult": 100.0, "hp_mult": 99.0, "rarity_weight": 0.1}, 
]

# Названия удочек 
ROD_NAMES = [
    "Удочка", "Спиннинг", "Карбоновая палка", "Телескоп", "Волшебная палочка",
    "Копье", "Морской трезубец", "Бамбуковая палочка", "Ледяной посох", "Огненный мечик",
    "Стальная спица", "Золотой стержень", "Серебряная игла", "Древний артефакт", "Кристаллическая палка"
]

ACHIEVEMENTS_LIST = {
    "first_fish": {"name": "Первый улов", "desc": "Поймайте свою первую рыбу", "target": 1},
    "big_fish": {"name": "Рыболов-любитель", "desc": "Поймайте 50 рыб", "target": 50},
    "rich_man": {"name": "Богатей", "desc": "Накопите 1000 монет", "target": 1000},
    "collector": {"name": "Коллекционер", "desc": "Владейте 5 удочками (Не работает)", "target": 5}
}


# КОНСТАНТЫ ДЛЯ ФРОНТА

ROD_PROPERTY_NAMES = {
    'reward': '💰 Множитель награды',
    'xp': '✨ Опыт',
    'luck': '🍀 Удача',
    'speed': '⚡ Скорость',
    'durability': '🛡️ Прочность',
    'crit': '💥 Крит-удар',
    'power': '💪 Мощь',
    'piercing': '🔓 Пробивание'
}

# Описания свойств удочек
ROD_PROPERTY_DESCRIPTIONS = {
    'reward': 'Увеличивает количество монет, получаемых за улов',
    'xp': 'Увеличивает количество опыта за улов',
    'luck': 'Повышает шанс поймать рыбу редкой редкости',
    'speed': 'Ускоряет скорость рыбалки (сокращает время между забросами)',
    'crit': 'Шанс нанести критический удар и получить 2.5x награду',
    'durability': 'Определяет сколько раз можно использовать удочку',
    'power': 'Увеличивает урон удочки процентно',
    'piercing': 'Увеличивает порог автоловки слабых рыб на X HP'
}

# Значения свойств по тирам (включая GS)
ROD_PROPERTY_VALUES = {
    'reward': {
        1: 1.0, 2: 1.2, 3: 1.4, 4: 1.7, 5: 2.0,
        6: 2.5, 7: 3.2, 8: 4.0, 9: 5.5, 10: 8.0
    },
    'xp': {
        1: 1.0, 2: 1.1, 3: 1.2, 4: 1.4, 5: 1.7,
        6: 2.0, 7: 2.5, 8: 3.2, 9: 4.0, 10: 5.5
    },
    'luck': {
        1: 0.0, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.25,
        6: 0.35, 7: 0.50, 8: 0.75, 9: 1.0, 10: 1.5
    },
    'speed': {
        1: 0.0, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.25,
        6: 0.35, 7: 0.50, 8: 0.70, 9: 1.0, 10: 1.5
    },
    'crit': {
        1: 0.0, 2: 0.02, 3: 0.05, 4: 0.08, 5: 0.12,
        6: 0.17, 7: 0.25, 8: 0.35, 9: 0.50, 10: 0.75
    },
    'power': {
        1: 1.05, 2: 1.1, 3: 1.2, 4: 1.3, 5: 1.5,
        6: 1.7, 7: 2.0, 8: 2.5, 9: 3.0, 10: 4.0
    },
    'piercing': {
        1: 0, 2: 1, 3: 2, 4: 3, 5: 5,
        6: 8, 7: 12, 8: 18, 9: 25, 10: 35
    }
}

# Gear Score значения (GS) для каждого тира каждого свойства
ROD_PROPERTY_GS = {
    'reward': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'xp': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'luck': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'speed': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'durability': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'crit': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'power': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32},
    'piercing': {1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 14, 8: 18, 9: 24, 10: 32}
}








# main.py

# ПРЕФИКСЫ (Влияют на Скорость и Опыт)
PREFIXES = [
    # Common
    {"name": "Трухлявая", "rarity": "common", "speed": -0.2, "xp": 0.8},
    {"name": "Тяжелая", "rarity": "common", "speed": -0.1, "xp": 1.0},
    {"name": "Обычная", "rarity": "common", "speed": 0.0, "xp": 1.0},
    # Rare
    {"name": "Гибкая", "rarity": "rare", "speed": 0.15, "xp": 1.1},
    {"name": "Удобная", "rarity": "rare", "speed": 0.1, "xp": 1.3},
    {"name": "Спортивная", "rarity": "rare", "speed": 0.25, "xp": 1.0},
    # Epic
    {"name": "Высокотехнологичная", "rarity": "epic", "speed": 0.4, "xp": 1.2},
    {"name": "Магическая", "rarity": "epic", "speed": 0.1, "xp": 2.5},
    {"name": "Сверхзвуковая", "rarity": "epic", "speed": 0.6, "xp": 0.9},
    # Legendary
    {"name": "Божественная", "rarity": "legendary", "speed": 0.5, "xp": 3.0},
    {"name": "Астральная", "rarity": "legendary", "speed": 0.8, "xp": 1.5},
    {"name": "Кибернетическая", "rarity": "legendary", "speed": 0.7, "xp": 2.0},
]

# ОСНОВЫ (Влияют на Множитель денег)
ROD_BASES = [
    {"name": "Палка", "rarity": "common", "mult": 0.5},
    {"name": "Удочка", "rarity": "common", "mult": 1.0},
    {"name": "Спиннинг", "rarity": "rare", "mult": 1.8},
    {"name": "Телескопичка", "rarity": "rare", "mult": 2.2},
    {"name": "Карбоновая нить", "rarity": "epic", "mult": 4.0},
    {"name": "Гарпун", "rarity": "epic", "mult": 5.5},
    {"name": "Расщепитель атомов", "rarity": "legendary", "mult": 12.0},
]

# СУФФИКСЫ (Влияют на Удачу и Прочность)
SUFFIXES = [
    # Common
    {"name": "из мусора", "rarity": "common", "rare": 0.0, "dur": 10},
    {"name": "Новичка", "rarity": "common", "rare": 0.02, "dur": 30},
    {"name": "с помойки", "rarity": "common", "rare": -0.05, "dur": 15},
    # Rare
    {"name": "Рыболова", "rarity": "rare", "rare": 0.1, "dur": 100},
    {"name": "Удачи", "rarity": "rare", "rare": 0.25, "dur": 60},
    {"name": "Стали", "rarity": "rare", "rare": 0.05, "dur": 300},
    # Epic
    {"name": "Погибели", "rarity": "epic", "rare": 0.4, "dur": 150},
    {"name": "Магната", "rarity": "epic", "rare": 0.2, "dur": 500},
    {"name": "Вечности", "rarity": "epic", "rare": 0.15, "dur": -1}, # Неломаемая
    # Legendary
    {"name": "Дракона", "rarity": "legendary", "rare": 0.8, "dur": 1000},
    {"name": "Посейдона", "rarity": "legendary", "rare": 1.5, "dur": 2000},
    {"name": "Читера", "rarity": "legendary", "rare": 5.0, "dur": 7}, # Мощная, но на 7 забросов
]


ACHIEVEMENTS_LIST = {
    "first_fish": {"name": "Первый улов", "desc": "Поймайте свою первую рыбу", "target": 1},
    "big_fish": {"name": "Рыболов-любитель", "desc": "Поймайте 50 рыб", "target": 50},
    "rich_man": {"name": "Богатей", "desc": "Накопите 1000 монет", "target": 1000},
    "collector": {"name": "Коллекционер", "desc": "Владейте 5 удочками (Не работает)", "target": 5}
}

ACHIEVEMENT_RULES = {
    "first_fish": lambda stats: stats['total_caught'] >= 1,
    "big_fish":   lambda stats: stats['total_caught'] >= 50,
    "rich_man":   lambda stats: stats['balance'] >= 1000,
    "collector":  lambda stats: stats['rods_count'] >= 5,
}