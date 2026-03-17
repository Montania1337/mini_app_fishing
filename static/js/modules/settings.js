/**
 * Settings Manager - Управление настройками приложения
 */

const SettingsManager = {
    // Значения по умолчанию
    defaults: {
        // FALSE (нормальный режим): наведение → tooltip, ПКМ → меню
        // TRUE (мобильный режим): одиночный тап → bottom sheet, двойной тап → надеть
        actionMenuOnTap: false
    },

    // Текущие настройки (загружаются из localStorage)
    settings: {},

    // Ключ для localStorage
    storageKey: 'fishing_game_settings',

    // Инициализация - загружаем настройки из localStorage или используем дефолты
    init() {
        console.log('[SettingsManager] Инициализация...');
        
        // Пытаемся загрузить из localStorage
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                this.settings = JSON.parse(saved);
                console.log('[SettingsManager] Загружены настройки:', this.settings);
            } catch (e) {
                console.warn('[SettingsManager] Ошибка загрузки настроек:', e);
                this.settings = { ...this.defaults };
            }
        } else {
            this.settings = { ...this.defaults };
            console.log('[SettingsManager] Используются дефолтные настройки:', this.settings);
        }

        // Обновляем UI чтобы отразить текущие значения
        this.updateUI();
    },

    // Сохранить настройки в localStorage
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        console.log('[SettingsManager] Настройки сохранены:', this.settings);
    },

    // Получить конкретную настройку
    getSetting(key) {
        return this.settings[key] !== undefined ? this.settings[key] : this.defaults[key];
    },

    // Установить конкретную настройку
    setSetting(key, value) {
        this.settings[key] = value;
        this.save();
        console.log('[SettingsManager] Установлена настройка', key, '=', value);
        
        // Уведомляем об изменении
        this.onSettingChanged?.(key, value);
    },

    // Обновить UI на основе текущих настроек
    updateUI() {
        const toggle = document.getElementById('action-menu-toggle');
        if (toggle) {
            toggle.checked = this.getSetting('actionMenuOnTap');
            
            // Удаляем старый обработчик если есть
            toggle.removeEventListener('change', this.handleToggleChange);
            
            // Добавляем новый обработчик
            this.handleToggleChange = (e) => {
                console.log('[SettingsManager] Toggle изменен на:', e.target.checked);
                this.setSetting('actionMenuOnTap', e.target.checked);
            };
            
            toggle.addEventListener('change', this.handleToggleChange);
        }
    },

    // Показать модаль настроек
    showModal(settingsModal) {
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    },

    // Скрыть модаль настроек
    hideModal(settingsModal) {
        if (settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }
};
