import sqlite3
import json
from typing import Optional, List, Dict

DB_PATH = 'fishing.db'

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # row['id']
    return conn

def init_db():
    """Инициализация всех таблиц базы данных"""
    with get_connection() as conn:
        # 1. Таблица игроков
        conn.execute('''
            CREATE TABLE IF NOT EXISTS players (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                balance INTEGER DEFAULT 0,
                max_catch INTEGER DEFAULT 0,
                total_caught INTEGER DEFAULT 0
            )
        ''')
        
        # 2. Таблица удочек 
        conn.execute('''
            CREATE TABLE IF NOT EXISTS rods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT,
                rarity TEXT,
                properties TEXT,
                is_active INTEGER DEFAULT 0,
                position INTEGER DEFAULT 0,
                durability INTEGER DEFAULT 100,
                min_damage INTEGER DEFAULT 1,
                max_damage INTEGER DEFAULT 3,
                gear_score INTEGER DEFAULT 0,
                upgrade_level INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES players(user_id)
            )
        ''')

        # 3. Таблица достижений
        conn.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                user_id INTEGER,
                achievement_key TEXT,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, achievement_key)
            )
        ''')
        
        # МИГРАЦИЯ: Если база уже была, добавим колонки вручную
        try:
            conn.execute("ALTER TABLE players ADD COLUMN total_caught INTEGER DEFAULT 0")
        except: pass
        try:
            conn.execute("ALTER TABLE rods ADD COLUMN properties TEXT")
        except: pass
        try:
            conn.execute("ALTER TABLE rods ADD COLUMN position INTEGER DEFAULT 0")
        except: pass
        try:
            conn.execute("ALTER TABLE rods ADD COLUMN durability INTEGER DEFAULT 100")
        except: pass
        try:
            conn.execute("ALTER TABLE rods ADD COLUMN min_damage INTEGER DEFAULT 1")
        except: pass
        try:
            conn.execute("ALTER TABLE rods ADD COLUMN max_damage INTEGER DEFAULT 3")
        except: pass
        conn.commit()

    print("База данных успешно инициализирована")

# --- ФУНКЦИИ ИГРОКА ---

def get_player(user_id: int, username: str) -> Dict:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO players (user_id, username, balance, max_catch, total_caught) VALUES (?, ?, 0, 0, 0)", (user_id, username))
        conn.commit()
        cursor.execute("SELECT * FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            player = dict(row)
            # Убеждаемся что все поля имеют значения, не None
            if player.get('balance') is None:
                player['balance'] = 0
            if player.get('max_catch') is None:
                player['max_catch'] = 0
            if player.get('total_caught') is None:
                player['total_caught'] = 0
            return player
        return {"user_id": user_id, "username": username, "balance": 0, "max_catch": 0, "total_caught": 0}

def update_balance(user_id: int, amount: int) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET balance = balance + ? WHERE user_id = ? RETURNING balance", (amount, user_id))
        res = cursor.fetchone()
        conn.commit()
        return res[0]

def increment_total_caught(user_id: int) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET total_caught = total_caught + 1 WHERE user_id = ? RETURNING total_caught", (user_id,))
        res = cursor.fetchone()
        conn.commit()
        return res[0]

def get_player_stats(user_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT balance, total_caught FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else {"balance": 0, "total_caught": 0}

# --- ФУНКЦИИ УДОЧЕК ---

def add_rod(user_id: int, rod_data: Dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Get the next position
        cursor.execute("SELECT MAX(COALESCE(position, -1)) FROM rods WHERE user_id = ?", (user_id,))
        max_pos = cursor.fetchone()[0]
        if max_pos is None:
            max_pos = -1
        next_position = max_pos + 1
        
        properties_json = json.dumps(rod_data.get('properties', {}))
        durability = rod_data.get('durability', 100)  # Default 100 casts
        min_damage = rod_data.get('min_damage', 1)
        max_damage = rod_data.get('max_damage', 3)
        gear_score = rod_data.get('gear_score', 0)
        
        cursor.execute('''
            INSERT INTO rods (user_id, name, rarity, properties, is_active, position, durability, min_damage, max_damage, gear_score, upgrade_level)
            VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0)
        ''', (user_id, rod_data['name'], rod_data['rarity'], properties_json, next_position, durability, min_damage, max_damage, gear_score))
        rod_id = cursor.lastrowid
        conn.commit()
        return rod_id

def get_user_rods(user_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rods WHERE user_id = ? ORDER BY COALESCE(position, id)", (user_id,))
        rods = []
        for row in cursor.fetchall():
            rod = dict(row)
            # Обеспечиваем что properties это валидный JSON
            if not rod.get('properties'):
                rod['properties'] = '{}'
            elif isinstance(rod['properties'], str):
                try:
                    json.loads(rod['properties'])
                except:
                    rod['properties'] = '{}'
            # Обеспечиваем что position это число, не None
            if rod.get('position') is None:
                rod['position'] = 0
            if rod.get('durability') is None:
                rod['durability'] = 100
            if rod.get('min_damage') is None:
                rod['min_damage'] = 1
            if rod.get('max_damage') is None:
                rod['max_damage'] = 3
            rods.append(rod)
        return rods

def get_active_rod(user_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rods WHERE user_id = ? AND is_active = 1", (user_id,))
        row = cursor.fetchone()
        if not row:
            return None
        rod = dict(row)
        # Mantenemos properties como string pero validamos que es JSON válido
        if isinstance(rod.get('properties'), str):
            try:
                json.loads(rod['properties'])
            except:
                rod['properties'] = '{}'
        # Убеждаемся что урон есть
        if rod.get('min_damage') is None:
            rod['min_damage'] = 1
        if rod.get('max_damage') is None:
            rod['max_damage'] = 3
        return rod

def set_active_rod_db(user_id: int, rod_id: int):
    with get_connection() as conn:
        conn.execute("UPDATE rods SET is_active = 0 WHERE user_id = ?", (user_id,))
        conn.execute("UPDATE rods SET is_active = 1 WHERE user_id = ? AND id = ?", (user_id, rod_id))
        conn.commit()

def reduce_durability(rod_id: int):
    """Уменьшает прочность удочки на 1. 1 заброс = 1 прочность."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Get current durability
        cursor.execute("SELECT durability FROM rods WHERE id = ?", (rod_id,))
        res = cursor.fetchone()
        if not res:
            return {"status": "broken", "durability": 0}
        
        current_durability = res['durability']
        
        # Decrease by 1 (one cast = 1 durability)
        new_durability = current_durability - 1
        
        if new_durability <= 0:
            # Rod is broken, delete it
            cursor.execute("DELETE FROM rods WHERE id = ?", (rod_id,))
            conn.commit()
            return {"status": "broken", "durability": 0}
        
        # Update durability in database
        cursor.execute("UPDATE rods SET durability = ? WHERE id = ?", (new_durability, rod_id))
        conn.commit()
        return {"status": "ok", "durability": new_durability}
        return "ok"

def get_rod_by_id(rod_id: int) -> Optional[Dict]:
    """Получить удочку по ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rods WHERE id = ?", (rod_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

def update_rod_upgrade(rod_id: int, new_level: int, damage_bonus: int):
    """Обновить уровень улучшения и базовый урон удочки"""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Получаем текущую удочку
        cursor.execute("SELECT min_damage, max_damage FROM rods WHERE id = ?", (rod_id,))
        rod = cursor.fetchone()
        if rod:
            min_damage, max_damage = rod
            new_min = min_damage + damage_bonus
            new_max = max_damage + damage_bonus
            cursor.execute(
                "UPDATE rods SET upgrade_level = ?, min_damage = ?, max_damage = ? WHERE id = ?",
                (new_level, new_min, new_max, rod_id)
            )
            conn.commit()

# --- ДОСТИЖЕНИЯ ---

def unlock_achievement_db(user_id, ach_key):
    with get_connection() as conn:
        conn.execute("INSERT OR IGNORE INTO achievements (user_id, achievement_key) VALUES (?, ?)", (user_id, ach_key))
        conn.commit()

def get_unlocked_achievements(user_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT achievement_key FROM achievements WHERE user_id = ?", (user_id,))
        return [row[0] for row in cursor.fetchall()]
    


def get_top_by_balance(limit=10):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT username, balance FROM players 
            ORDER BY balance DESC LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]

def get_top_by_catch(limit=10):
    with get_connection() as conn:
        cursor = conn.cursor()
        # Предполагаем, что у тебя в таблице players есть поле max_catch
        # Если нет, его нужно добавить при инициализации БД
        cursor.execute('''
            SELECT username, max_catch FROM players 
            ORDER BY max_catch DESC LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]
    

def update_max_catch(user_id, amount):
    with get_connection() as conn:
        cursor = conn.cursor()
        # Исправлено: заменяем 'id' на 'user_id'
        cursor.execute('''
            UPDATE players 
            SET max_catch = MAX(max_catch, ?) 
            WHERE user_id = ?
        ''', (amount, user_id))
        conn.commit()

def delete_rod_db(user_id: int, rod_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT position FROM rods WHERE id = ? AND user_id = ?", (rod_id, user_id))
        row = cursor.fetchone()
        
        if row:
            deleted_position = row['position'] if row['position'] is not None else 0
            
            cursor.execute("DELETE FROM rods WHERE id = ? AND user_id = ?", (rod_id, user_id))
            
            if deleted_position is not None:
                cursor.execute('''
                    UPDATE rods 
                    SET position = position - 1 
                    WHERE user_id = ? AND position > ?
                ''', (user_id, deleted_position))
            
            conn.commit()
            return True
        return False

def swap_rods_by_index(user_id: int, from_index: int, to_index: int):
    """Меняет местами удочки в инвентаре по индексам"""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Получаем все удочки пользователя упорядоченные по положению
        cursor.execute("SELECT id FROM rods WHERE user_id = ? ORDER BY COALESCE(position, id)", (user_id,))
        rod_ids = [row['id'] for row in cursor.fetchall()]
        
        # Проверяем границы индексов
        if from_index < 0 or to_index < 0 or from_index >= len(rod_ids) or to_index >= len(rod_ids):
            return False
        
        if from_index == to_index:
            return True
        
        # Меняем местами элементы в списке
        rod_ids[from_index], rod_ids[to_index] = rod_ids[to_index], rod_ids[from_index]
        
        # Обновляем позиции в базе данных
        for idx, rod_id in enumerate(rod_ids):
            cursor.execute("UPDATE rods SET position = ? WHERE id = ?", (idx, rod_id))
        
        conn.commit()
        return True