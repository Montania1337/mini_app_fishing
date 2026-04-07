from enum import Enum

class Colors(str, Enum):
    Default = ""
    RED = "360"
    GREEN = "60"
    BLUE = "180"
    CIAN = "150"
    PURPLE = "240"
    PINK = "330"

FISHES_DAY = [
    {"name": "Карась", "emoji": "🐟", "rarity": "common", "color": Colors.Default, "base_price": 10, "base_hp": 12, "visual_points": 0, "rarity_weight": 500},
    {"name": "Креветка", "emoji": "🦐", "rarity": "common", "color": Colors.PURPLE, "base_price": 15, "base_hp": 5, "visual_points": 0, "rarity_weight": 200},
    {"name": "Окунь", "emoji": "🐠", "rarity": "uncommon", "color": Colors.PINK, "base_price": 15, "base_hp": 20, "visual_points": 5, "rarity_weight": 300},
    {"name": "Краб", "emoji": "🦀", "rarity": "rare", "color": "normal", "base_price": 35, "base_hp": 20, "visual_points": 10, "rarity_weight": 150},
    {"name": "Фугу", "emoji": "🐡", "rarity": "rare", "color": "normal", "base_price": 25, "base_hp": 35, "visual_points": 10, "rarity_weight": 80},
    {"name": "Золотая рыбка", "emoji": "✨", "rarity": "epic", "color": "normal", "base_price": 100, "base_hp": 75, "visual_points": 20, "rarity_weight": 35},
    {"name": "Акула", "emoji": "🦈", "rarity": "epic", "color": "normal", "base_price": 150, "base_hp": 100, "visual_points": 20, "rarity_weight": 15},
    {"name": "Кракен", "emoji": "🦑", "rarity": "legendary", "color": "normal", "base_price": 500, "base_hp": 200, "visual_points": 50, "rarity_weight": 3},
    {"name": "Молюск", "emoji": "🦪", "rarity": "legendary", "color": "normal", "base_price": 150, "base_hp": 5, "visual_points": 50, "rarity_weight": 1},
]

FISH_PREFIXES = [
    # Мелкие 
    {"name": "Крошечная", "mult": 0.4, "hp_mult": 0.3, "rarity_weight": 100},
    {"name": "Хилая", "mult": 0.6, "hp_mult": 0.5, "rarity_weight": 80},
    {"name": "Маленькая", "mult": 0.8, "hp_mult": 0.7, "rarity_weight": 150},
    # Обычные
    {"name": "", "mult": 1.0, "hp_mult": 1.0, "rarity_weight": 200},
    # Хорошие
    {"name": "Упитанная", "mult": 1.3, "hp_mult": 1.3, "rarity_weight": 70},
    {"name": "Жирная", "mult": 1.5, "hp_mult": 1.5, "rarity_weight": 50},
    {"name": "Бодрая", "mult": 1.6, "hp_mult": 1.4, "rarity_weight": 40},
    {"name": "Быстрая", "mult": 1.8, "hp_mult": 1.8, "rarity_weight": 20},
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
    {"name": "с барнаклами", "mult": 0.3, "hp_mult": 0.7, "rarity_weight": 50},
    {"name": "зомби", "mult": 1.2, "hp_mult": 1.5, "rarity_weight": 30},
    {"name": "мутант", "mult": 1.5, "hp_mult": 1.8, "rarity_weight": 20},
    {"name": "радиоактивная", "mult": 2.2, "hp_mult": 2.0, "rarity_weight": 15},
    {"name": "под гипнозом", "mult": 1.7, "hp_mult": 1.5, "rarity_weight": 15},
    # Магические / Ценные
    {"name": "из бездны", "mult": 2.5, "hp_mult": 2.8, "rarity_weight": 15},
    {"name": "светящаяся", "mult": 3.0, "hp_mult": 2.5, "rarity_weight": 12},
    {"name": "в короне", "mult": 4.5, "hp_mult": 4.0, "rarity_weight": 8},
    {"name": "хрустальная", "mult": 6.0, "hp_mult": 5.5, "rarity_weight": 5},
    {"name": "из чистого серебра", "mult": 12.0, "hp_mult": 10.0, "rarity_weight": 3},
    {"name": "из чистого золота", "mult": 25.0, "hp_mult": 22.0, "rarity_weight": 1.5},
    {"name": "Алмазная", "mult": 50.0, "hp_mult": 45.0, "rarity_weight": 0.5},
    {"name": "Админская", "mult": 100.0, "hp_mult": 99.0, "rarity_weight": 0.1}, 
]

FISHES_RARITIES = {
    "mythic": 100,
    "legendary" : 50,
    "epic" : 20,
    "rare" : 10,
    "uncommon" : 5,
    "common" : 1,
}

def calculate_all_fishes():
    # Пороги из твоего словаря (сортируем от самого сложного к самому частому)
    # Предполагаем, что если итоговый вес <= порога, то это эта редкость
    sorted_rarities = sorted(FISHES_RARITIES.items(), key=lambda x: x[1])

    results = []

    for fish in FISHES_DAY:
        for prefix in FISH_PREFIXES:
            for suffix in FISH_SUFFIXES:
                # Считаем итоговый вес редкости (шанс выпадения)
                # Чем МЕНЬШЕ число, тем реже рыба
                total_rarity = FISHES_RARITIES[fish["rarity"]] + prefix['mult'] + suffix['mult']
                
                display_rarity = next((name for name, score in FISHES_RARITIES.items() if total_rarity >= score), "common")


                # Формируем красивое название
                full_name = f"{prefix['name']} {fish['name']} {suffix['name']}".strip().replace("  ", " ")
                
                results.append({
                    "name": full_name,
                    "rarity": display_rarity,
                    "display_rarity": total_rarity
                })
    
    return results

# Запуск и вывод первых 10 вариантов для примера
all_variants = calculate_all_fishes()
for f in all_variants[:40]:
    print(f"[{f['rarity'].upper()}] [{f['display_rarity']}] {f['name']}")
