// ============================================================
// MAIN GAME FILE - Инициализация и управление игровым циклом
// ============================================================

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

tg.disableVerticalSwipes();
tg.enableClosingConfirmation()

// Пользователь Telegram
window.user = tg.initDataUnsafe?.user || { id: 1, first_name: "Test User" };

// Глобальное состояние
const GameState = {
    isLoading: false,
    balance: 0,
    activeRod: null,
    rods: []
};

const APP_META = {
    version: 'v0.1.1 b'
};

// DOM элементы
const UI_ELEMENTS = {
    balance: document.getElementById('balance'),
    name: document.getElementById('username'),
    rodInfo: document.getElementById('rod-info'),
    log: document.getElementById('log'),
    fishBtn: document.getElementById('fish-btn'),
    modal: document.getElementById('modal'),
    invBtn: document.getElementById('inventory-btn'),
    auctionBtn: document.getElementById('auction-btn'),
    closeModal: document.getElementById('close-modal'),
    invGrid: document.getElementById('inventory-grid'),
    buyBtnModal: document.getElementById('buy-btn-modal'),
    inventoryToolsToggle: document.getElementById('inventory-tools-toggle'),
    inventoryToolsPanel: document.getElementById('inventory-tools-panel'),
    autoDeleteGsInput: document.getElementById('auto-delete-gs-input'),
    autoDeleteGsBtn: document.getElementById('auto-delete-gs-btn'),
    priceTag: document.getElementById('price-tag'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    sideMenu: document.getElementById('side-menu'),
    sideMenuBackdrop: document.getElementById('sidebar-backdrop'),
    closeSideMenu: document.getElementById('close-side-menu'),
    sideMenuVersion: document.getElementById('side-menu-version'),
    auctionModal: document.getElementById('auction-modal'),
    closeAuctionModal: document.getElementById('close-auction-modal'),
    auctionSelectedRod: document.getElementById('auction-selected-rod'),
    auctionPriceInput: document.getElementById('auction-price-input'),
    auctionSubmitBtn: document.getElementById('auction-submit-btn'),
    auctionListings: document.getElementById('auction-listings'),
    auctionMyListings: document.getElementById('auction-my-listings'),
    auctionBottomSheet: document.getElementById('auction-bottom-sheet'),
    auctionBottomSheetTitle: document.getElementById('auction-bottom-sheet-title'),
    auctionBottomSheetMeta: document.getElementById('auction-bottom-sheet-meta'),
    auctionBottomSheetStats: document.getElementById('auction-bottom-sheet-stats'),
    auctionBottomSheetAction: document.getElementById('auction-bottom-sheet-action'),
    achBtn: document.getElementById('achievements-btn'),
    achModal: document.getElementById('achievements-modal'),
    achList: document.getElementById('achievements-list'),
    closeAchModal: document.getElementById('close-ach-modal'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsModal: document.getElementById('close-settings-modal'),
    leadBtn: document.getElementById('leaderboard-btn'),
    leadModal: document.getElementById('leaderboard-modal'),
    leadList: document.getElementById('leaderboard-list'),
    closeLead: document.getElementById('close-leaderboard'),
    tooltip: document.getElementById('rod-tooltip'),
    contextMenu: document.getElementById('rod-context-menu'),
    bottomSheet: document.getElementById('rod-bottom-sheet'),
    combatScreen: document.getElementById('combat-screen'),
    main: document.querySelector('main'),
    rodPanel: document.querySelector('.rod-panel')
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ КОНСТАНТ ИЗ СЕРВЕРА
// ============================================================
async function initializeGame() {
    try {
        // Загружаем константы с сервера
        const constants = await API.getConstants();
        console.log('Константы загружены:', constants);
        
        // Устанавливаем глобальные константы
        window.ROD_PROPERTY_NAMES = constants.ROD_PROPERTY_NAMES;
        window.ROD_PROPERTY_DESCRIPTIONS = constants.ROD_PROPERTY_DESCRIPTIONS;
        window.ROD_PROPERTY_VALUES = constants.ROD_PROPERTY_VALUES;
        window.ROD_UPGRADE_SYSTEM = constants.ROD_UPGRADE_SYSTEM;
        
        console.log('window.ROD_UPGRADE_SYSTEM установлена:', window.ROD_UPGRADE_SYSTEM);
        
        // Загружаем игроков
        const data = await API.login();
        GameState.balance = data.balance;
        GameState.rods = data.rods || [];
        GameState.activeRod = RodManager.resolveActiveRod(GameState.rods, data.active_rod || null);
        RodManager.currentRods = GameState.rods;
        
        // Обновляем UI
        UIManager.setHTML(UI_ELEMENTS.name, window.user.first_name);
        UIManager.updateBalance(GameState.balance);
        if (UI_ELEMENTS.sideMenuVersion) {
            UI_ELEMENTS.sideMenuVersion.textContent = APP_META.version;
        }
        
        // Инициализируем модули
        GameState.activeRod = RodManager.resolveActiveRod(GameState.rods, GameState.activeRod);
        RodManager.currentRods = GameState.rods;
        
        if (GameState.activeRod) {
            RodManager.renderRodInfo(GameState.activeRod, UI_ELEMENTS.rodInfo);
        }
        
        // Инициализируем UI обработчики
        initializeEventHandlers();
        
        // Инициализируем upgrade модуль
        if (typeof UpgradeManager !== 'undefined' && UpgradeManager.init) {
            UpgradeManager.init();
        }

        // Инициализируем settings модуль
        if (typeof SettingsManager !== 'undefined' && SettingsManager.init) {
            SettingsManager.init();
            
            // Регистрируем обработчик изменения настроек
            SettingsManager.onSettingChanged = (key, value) => {
                console.log('[onSettingChanged]', key, '=', value);
                
                // Когда переключается режим меню действий:
                if (key === 'actionMenuOnTap') {
                    if (value) {
                        // Режим включен (мобильный) -> скрываем tooltip и контекстное меню
                        console.log('[onSettingChanged] Режим меню включен, скрываем tooltip и меню');
                        TooltipManager.hide();
                        TooltipManager.hideContextMenu();
                        TooltipManager.hideBottomSheet();
                        AuctionManager.hideOverlays?.();
                    } else {
                        // Режим отключен (нормальный) -> скрываем bottom sheet
                        console.log('[onSettingChanged] Режим меню отключен, скрываем bottom sheet');
                        TooltipManager.hideBottomSheet();
                        AuctionManager.hideOverlays?.();
                    }
                }
            };
        }
        
        Log.success('Добро пожаловать в игру! 🎣');
    } catch (e) {
        Log.error(`Ошибка инициализации: ${e.message}`);
        console.error('Ошибка инициализации:', e);
    }
}

// ============================================================
// РЫБАЛКА (Основной цикл)
// ============================================================

async function onFish() {
    if (GameState.isLoading) return;
    
    GameState.isLoading = true;
    UI_ELEMENTS.fishBtn.disabled = true;

    try {
        const fishData = await API.fish();
        syncActiveRodState(fishData);
        
        // Проверяем, ловится ли рыба автоматически
        if (fishData.auto_catch) {
            // Автоматическая ловля - сразу выполняем удар без боя
            await onAutoCatch(fishData);
        } else {
            // Обычный бой
            CombatManager.show(fishData, UI_ELEMENTS.combatScreen);
            UI_ELEMENTS.main.style.display = 'none';
            UI_ELEMENTS.rodPanel.style.display = 'none';
            setupStrikeListener(fishData);
        }
    } catch (e) {
        Log.error(`Ошибка рыбалки: ${e.message}`);
    } finally {
        GameState.isLoading = false;
        UI_ELEMENTS.fishBtn.disabled = false;
    }
}

async function onAutoCatch(fishData) {
    try {
        const combatData = await API.strikeFish();
        CombatManager.showAutoCatchVictory(fishData, combatData, UI_ELEMENTS);
    } catch (e) {
        Log.error(`Ошибка автоловли: ${e.message}`);
    }
}

function syncActiveRodState(fishData) {
    if (!GameState.activeRod) return;

    if (fishData.is_broken) {
        const brokenRodId = GameState.activeRod.id;
        GameState.rods = GameState.rods.filter((rod) => rod.id !== brokenRodId);
        GameState.activeRod = null;
        RodManager.currentRods = GameState.rods;
        RodManager.renderRodInfo(null, UI_ELEMENTS.rodInfo);
        Log.warning('Активная удочка сломалась.');
        return;
    }

    if (fishData.durability_left === undefined) return;

    GameState.activeRod = {
        ...GameState.activeRod,
        durability: fishData.durability_left
    };

    GameState.rods = GameState.rods.map((rod) => {
        if (rod.id !== GameState.activeRod.id) return rod;
        return {
            ...rod,
            durability: fishData.durability_left
        };
    });

    RodManager.currentRods = GameState.rods;
    RodManager.renderRodInfo(GameState.activeRod, UI_ELEMENTS.rodInfo);
}

function setupStrikeListener(fishData) {
    const combatContainer = UI_ELEMENTS.combatScreen?.querySelector('.combat-container');
    if (!combatContainer) return;

    const handleStrike = async (e) => {
        combatContainer.removeEventListener('click', handleStrike);
        combatContainer.style.pointerEvents = 'none';

        try {
            const combatData = await API.strikeFish();
            
            // Обновляем HP
            CombatManager.updateHP(
                combatData.hp,
                combatData.max_hp,
                document.getElementById('combat-hp-fill'),
                document.getElementById('combat-hp-text')
            );

            // Показываем урон
            CombatManager.showDamage(combatData.damage, UI_ELEMENTS.combatScreen);

            // Если рыба мертва
            if (!combatData.is_alive) {
                CombatManager.showVictory(combatData, UI_ELEMENTS);
            } else {
                // Продолжаем слушать удары
                combatContainer.style.pointerEvents = 'auto';
                combatContainer.addEventListener('click', handleStrike);
            }
        } catch (e) {
            Log.error(`Ошибка удара: ${e.message}`);
            combatContainer.style.pointerEvents = 'auto';
            combatContainer.addEventListener('click', handleStrike);
        }
    };

    combatContainer.style.pointerEvents = 'auto';
    combatContainer.addEventListener('click', handleStrike);
}

// ============================================================
// ИНВЕНТАРЬ
// ============================================================

async function refreshInventory() {
    try {
        const data = await API.login();
        GameState.rods = data.rods || [];
        GameState.activeRod = RodManager.resolveActiveRod(GameState.rods, data.active_rod || GameState.activeRod);
        RodManager.currentRods = GameState.rods;
        InventoryManager.renderInventoryGrid(GameState.rods, UI_ELEMENTS.invGrid);
        RodManager.renderRodInfo(GameState.activeRod, UI_ELEMENTS.rodInfo);
    } catch (e) {
        Log.error(`Ошибка обновления инвентаря: ${e.message}`);
    }
}

InventoryManager.onSlotSelected = (rod, event) => {
    // При клике/тапе на слот:
    const useActionMenu = SettingsManager.getSetting('actionMenuOnTap');
    
    if (useActionMenu) {
        // Режим ON (мобильный): показываем bottom sheet при простом тапе
        console.log('[onSlotSelected] actionMenuOnTap=true, показываем bottom sheet');
        TooltipManager.showBottomSheet(rod, UI_ELEMENTS.bottomSheet);
    } else {
        // Режим OFF (нормальный): ничего не показываем
        console.log('[onSlotSelected] actionMenuOnTap=false, ничего не показываем');
    }
};

InventoryManager.onRodDoubleTap = (rod, event) => {
    // При двойном тапе/клике - экипируем удочку
    console.log('[onRodDoubleTap] Экипируем удочку:', rod.name);
    TooltipManager.onContextMenuAction?.('equip', rod);
    // Закрываем bottom sheet если он открыт
    TooltipManager.hideBottomSheet();
};

InventoryManager.onSlotHover = (rod, event) => {
    // При наведении: показываем tooltip только если toggle OFF (нормальный режим)
    const useActionMenu = SettingsManager.getSetting('actionMenuOnTap');
    
    if (!useActionMenu) {
        // Режим OFF (нормальный): показываем tooltip при наведении
        console.log('[onSlotHover] Показываем tooltip');
        TooltipManager.showRodTooltip(rod, event, UI_ELEMENTS.tooltip, false); // false = только характеристики
    } else {
        // Режим ON (мобильный): ничего не показываем
        console.log('[onSlotHover] actionMenuOnTap=true, ничего не показываем');
    }
};

InventoryManager.onSlotLeave = () => {
    console.log('[onSlotLeave] Мышка ушла со слота');
    TooltipManager.hide();
    // НЕ прячем меню - оно будет спрятано при mouseleave на самом меню или при клике вне
};

InventoryManager.onSlotContextMenu = (rod, event) => {
    // При долгом нажатии или ПКМ:
    const useActionMenu = SettingsManager.getSetting('actionMenuOnTap');
    
    if (useActionMenu) {
        // Режим ON (мобильный): показываем bottom sheet
        console.log('[onSlotContextMenu] actionMenuOnTap=true, показываем bottom sheet');
        TooltipManager.showBottomSheet(rod, UI_ELEMENTS.bottomSheet);
    } else {
        // Режим OFF (нормальный): показываем контекстное меню
        console.log('[onSlotContextMenu] actionMenuOnTap=false, показываем контекстное меню');
        TooltipManager.showContextMenu(rod, event, UI_ELEMENTS.contextMenu);
    }
};

TooltipManager.onContextMenuAction = async (action, rod) => {
    console.log('onContextMenuAction called with:', action, rod.name);
    try {
        if (action === 'equip') {
            await API.equipRod(rod.id);
            Log.success(`Надета удочка: ${rod.name}`);
            await refreshInventory();
        } else if (action === 'delete') {
            await API.deleteRod(rod.id);
            Log.success(`Удалена удочка: ${rod.name}`);
            await refreshInventory();
        } else if (action === 'upgrade') {
            console.log('Calling UpgradeManager.open for:', rod.name);
            UpgradeManager.open(rod);
        } else if (action === 'auction') {
            openAuction(rod);
        } else {
            console.log('Unknown action:', action);
        }
    } catch (e) {
        Log.error(`Ошибка: ${e.message}`);
    }
};

// ============================================================
// ПОКУПКА УДОЧЕК
// ============================================================

async function buyRod() {
    try {
        const data = await API.buyRod();
        UIManager.updateBalance(data.balance);
        await refreshInventory();
        Log.success(`🎲 Куплена: ${data.rod.name}. Наденьте её в инвентаре!`);
    } catch (e) {
        if (e.message && e.message.includes('Инвентарь полон')) {
            Log.error("🎒 Инвентарь полон! Удалите лишние удочки.");
        } else {
            Log.error(`Ошибка при покупке: ${e.message}`);
        }
    }
}

// ============================================================
// ДОСТИЖЕНИЯ
// ============================================================

async function autoDeleteRodsByGearScore() {
    const thresholdValue = UI_ELEMENTS.autoDeleteGsInput?.value?.trim();

    if (!thresholdValue) {
        Log.warning('Укажите порог Gear Score для автоудаления.');
        UI_ELEMENTS.autoDeleteGsInput?.focus();
        return;
    }

    const minGearScore = Number.parseInt(thresholdValue, 10);
    if (!Number.isInteger(minGearScore) || minGearScore < 0) {
        Log.error('Порог Gear Score должен быть целым числом от 0.');
        UI_ELEMENTS.autoDeleteGsInput?.focus();
        return;
    }

    const rodsToDelete = GameState.rods.filter((rod) => {
        const gearScore = Number(rod.gear_score ?? 0);
        return !rod.is_active && gearScore < minGearScore;
    });

    if (rodsToDelete.length === 0) {
        Log.warning(`Нет удочек с Gear Score ниже ${minGearScore} для удаления.`);
        return;
    }

    const isConfirmed = window.confirm(
        `Удалить ${rodsToDelete.length} удочек с Gear Score ниже ${minGearScore}? Активная удочка не будет затронута.`
    );
    if (!isConfirmed) {
        return;
    }

    try {
        if (UI_ELEMENTS.autoDeleteGsBtn) {
            UI_ELEMENTS.autoDeleteGsBtn.disabled = true;
        }

        const result = await API.deleteRodsBelowGearScore(minGearScore);
        await refreshInventory();

        if (result.deleted_count > 0) {
            Log.success(`Удалено удочек: ${result.deleted_count} (GS < ${minGearScore}).`);
        } else {
            Log.warning(`Удалять нечего: удочек с GS ниже ${minGearScore} не найдено.`);
        }
    } catch (e) {
        Log.error(`Ошибка автоудаления: ${e.message}`);
    } finally {
        if (UI_ELEMENTS.autoDeleteGsBtn) {
            UI_ELEMENTS.autoDeleteGsBtn.disabled = false;
        }
    }
}

function setInventoryToolsOpen(isOpen) {
    if (!UI_ELEMENTS.inventoryToolsPanel || !UI_ELEMENTS.inventoryToolsToggle) return;

    UI_ELEMENTS.inventoryToolsPanel.classList.toggle('is-open', isOpen);
    UI_ELEMENTS.inventoryToolsPanel.setAttribute('aria-hidden', String(!isOpen));
    UI_ELEMENTS.inventoryToolsToggle.setAttribute('aria-expanded', String(isOpen));
}

function toggleInventoryToolsPanel() {
    const isOpen = UI_ELEMENTS.inventoryToolsToggle?.getAttribute('aria-expanded') === 'true';
    setInventoryToolsOpen(!isOpen);
}

async function openAchievements() {
    try {
        const achievements = await API.getAchievements();
        AchievementManager.renderAchievements(achievements, UI_ELEMENTS.achList);
        UIManager.showModal(UI_ELEMENTS.achModal);
    } catch (e) {
        Log.error(`Ошибка загрузки достижений: ${e.message}`);
    }
}

// ============================================================
// НАСТРОЙКИ
// ============================================================

function openSettings() {
    SettingsManager.showModal(UI_ELEMENTS.settingsModal);
}

function openAuction(selectedRod = null) {
    AuctionManager.open(selectedRod);
}

let sideMenuHideTimer = null;

function openSideMenu() {
    if (!UI_ELEMENTS.sideMenu || !UI_ELEMENTS.sideMenuBackdrop) return;

    clearTimeout(sideMenuHideTimer);
    UI_ELEMENTS.sideMenu.classList.remove('hidden');
    UI_ELEMENTS.sideMenuBackdrop.classList.remove('hidden');
    UI_ELEMENTS.sideMenu.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
        UI_ELEMENTS.sideMenu.classList.add('is-open');
    });
}

function closeSideMenu() {
    if (!UI_ELEMENTS.sideMenu || !UI_ELEMENTS.sideMenuBackdrop) return;

    UI_ELEMENTS.sideMenu.classList.remove('is-open');
    UI_ELEMENTS.sideMenu.setAttribute('aria-hidden', 'true');
    UI_ELEMENTS.sideMenuBackdrop.classList.add('hidden');

    clearTimeout(sideMenuHideTimer);
    sideMenuHideTimer = setTimeout(() => {
        UI_ELEMENTS.sideMenu.classList.add('hidden');
    }, 220);
}

function toggleSideMenu() {
    if (!UI_ELEMENTS.sideMenu) return;

    if (UI_ELEMENTS.sideMenu.classList.contains('hidden')) {
        openSideMenu();
    } else {
        closeSideMenu();
    }
}

// ============================================================
// ЛИДЕРБОРД
// ============================================================

let leaderboardData = { by_balance: [], by_catch: [], by_max_catch: [] };

async function openLeaderboard() {
    try {
        leaderboardData = await API.getLeaderboard();
        ensureLeaderboardTabs();
        LeaderboardManager.renderLeaderboard(getActiveLeaderboardType(), leaderboardData, UI_ELEMENTS.leadList);
        UIManager.showModal(UI_ELEMENTS.leadModal);
        setupLeaderboardTabs();
    } catch (e) {
        Log.error(`Ошибка загрузки лидерборда: ${e.message}`);
    }
}

function ensureLeaderboardTabs() {
    const tabsContainer = UI_ELEMENTS.leadModal?.querySelector('.tabs');
    if (!tabsContainer) return;

    const balanceTab = tabsContainer.querySelector('[data-tab="balance"]');
    const catchTab = tabsContainer.querySelector('[data-tab="catch"]');
    let maxCatchTab = tabsContainer.querySelector('[data-tab="max-catch"]');

    if (balanceTab) balanceTab.textContent = '💰 Богачи';
    if (catchTab) catchTab.textContent = '🎣 Рыбы';

    if (!maxCatchTab) {
        maxCatchTab = document.createElement('button');
        maxCatchTab.className = 'tab-btn';
        maxCatchTab.dataset.tab = 'max-catch';
        maxCatchTab.textContent = '🐟 Максимальный улов';
        tabsContainer.appendChild(maxCatchTab);
    }
}

function getLeaderboardTypeByTab(tabName) {
    const typeMap = {
        balance: 'by_balance',
        catch: 'by_catch',
        'max-catch': 'by_max_catch'
    };
    return typeMap[tabName] || 'by_balance';
}

function getActiveLeaderboardType() {
    const activeTab = UI_ELEMENTS.leadModal?.querySelector('.tabs .tab-btn.active');
    return getLeaderboardTypeByTab(activeTab?.dataset.tab);
}

function setupLeaderboardTabs() {
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => UIManager.removeClass(t, 'active'));
            UIManager.addClass(tab, 'active');
            
            const type = getLeaderboardTypeByTab(tab.dataset.tab);
            LeaderboardManager.renderLeaderboard(type, leaderboardData, UI_ELEMENTS.leadList);
        };
    });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

function initializeEventHandlers() {
    // Рыбалка
    if (UI_ELEMENTS.fishBtn) {
        UI_ELEMENTS.fishBtn.onclick = onFish;
    }

    // Инвентарь
    if (UI_ELEMENTS.invBtn) {
        UI_ELEMENTS.invBtn.onclick = () => {
            closeSideMenu();
            UIManager.showModal(UI_ELEMENTS.modal);
            setInventoryToolsOpen(false);
            refreshInventory();
        };
    }

    if (UI_ELEMENTS.auctionBtn) {
        UI_ELEMENTS.auctionBtn.onclick = () => {
            closeSideMenu();
            openAuction();
        };
    }

    if (UI_ELEMENTS.closeModal) {
        UI_ELEMENTS.closeModal.onclick = () => {
            UIManager.hideModal(UI_ELEMENTS.modal);
            setInventoryToolsOpen(false);
            TooltipManager.hide();
            TooltipManager.hideContextMenu();
        };
    }

    // Покупка
    if (UI_ELEMENTS.buyBtnModal) {
        UI_ELEMENTS.buyBtnModal.onclick = buyRod;
    }

    if (UI_ELEMENTS.inventoryToolsToggle) {
        UI_ELEMENTS.inventoryToolsToggle.onclick = toggleInventoryToolsPanel;
    }

    if (UI_ELEMENTS.autoDeleteGsBtn) {
        UI_ELEMENTS.autoDeleteGsBtn.onclick = autoDeleteRodsByGearScore;
    }

    if (UI_ELEMENTS.autoDeleteGsInput) {
        UI_ELEMENTS.autoDeleteGsInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                autoDeleteRodsByGearScore();
            }
        });
    }

    if (UI_ELEMENTS.closeAuctionModal) {
        UI_ELEMENTS.closeAuctionModal.onclick = () => {
            AuctionManager.close();
        };
    }

    if (UI_ELEMENTS.auctionSubmitBtn) {
        UI_ELEMENTS.auctionSubmitBtn.onclick = () => {
            AuctionManager.submitSelectedRod();
        };
    }

    // Достижения
    if (UI_ELEMENTS.achBtn) {
        UI_ELEMENTS.achBtn.onclick = () => {
            closeSideMenu();
            openAchievements();
        };
    }

    if (UI_ELEMENTS.closeAchModal) {
        UI_ELEMENTS.closeAchModal.onclick = () => {
            UIManager.hideModal(UI_ELEMENTS.achModal);
        };
    }

    // Настройки
    if (UI_ELEMENTS.settingsBtn) {
        UI_ELEMENTS.settingsBtn.onclick = () => {
            closeSideMenu();
            openSettings();
        };
    }

    if (UI_ELEMENTS.closeSettingsModal) {
        UI_ELEMENTS.closeSettingsModal.onclick = () => {
            SettingsManager.hideModal(UI_ELEMENTS.settingsModal);
        };
    }

    // Лидерборд
    if (UI_ELEMENTS.leadBtn) {
        UI_ELEMENTS.leadBtn.onclick = () => {
            closeSideMenu();
            openLeaderboard();
        };
    }

    if (UI_ELEMENTS.closeLead) {
        UI_ELEMENTS.closeLead.onclick = () => {
            UIManager.hideModal(UI_ELEMENTS.leadModal);
        };
    }

    if (UI_ELEMENTS.sidebarToggle) {
        UI_ELEMENTS.sidebarToggle.onclick = () => {
            toggleSideMenu();
        };
    }

    if (UI_ELEMENTS.closeSideMenu) {
        UI_ELEMENTS.closeSideMenu.onclick = () => {
            closeSideMenu();
        };
    }

    if (UI_ELEMENTS.sideMenuBackdrop) {
        UI_ELEMENTS.sideMenuBackdrop.onclick = () => {
            closeSideMenu();
        };
    }

    // Bottom Sheet (мобильный режим)
    const closeBottomSheetBtn = document.getElementById('close-bottom-sheet');
    if (closeBottomSheetBtn) {
        closeBottomSheetBtn.onclick = () => {
            TooltipManager.hideBottomSheet();
        };
    }

    const closeAuctionBottomSheetBtn = document.getElementById('close-auction-bottom-sheet');
    if (closeAuctionBottomSheetBtn) {
        closeAuctionBottomSheetBtn.onclick = () => {
            AuctionManager.hideBottomSheet();
        };
    }

    // Скрытие tooltip и context menu при клике вне их
    // Desktop click
    document.addEventListener('click', (e) => {
        if (UI_ELEMENTS.tooltip && !UI_ELEMENTS.tooltip.contains(e.target) && !UI_ELEMENTS.tooltip.classList.contains('hidden')) {
            TooltipManager.hide();
        }
        if (UI_ELEMENTS.contextMenu && !UI_ELEMENTS.contextMenu.contains(e.target) && !UI_ELEMENTS.contextMenu.classList.contains('hidden')) {
            TooltipManager.hideContextMenu();
        }
        if (UI_ELEMENTS.bottomSheet && !UI_ELEMENTS.bottomSheet.contains(e.target) && !UI_ELEMENTS.bottomSheet.classList.contains('hidden')) {
            TooltipManager.hideBottomSheet();
        }
        if (UI_ELEMENTS.auctionBottomSheet && !UI_ELEMENTS.auctionBottomSheet.contains(e.target) && !UI_ELEMENTS.auctionBottomSheet.classList.contains('hidden')) {
            AuctionManager.hideBottomSheet();
        }
        if (UI_ELEMENTS.sideMenu &&
            !UI_ELEMENTS.sideMenu.classList.contains('hidden') &&
            !UI_ELEMENTS.sideMenu.contains(e.target) &&
            e.target !== UI_ELEMENTS.sidebarToggle) {
            closeSideMenu();
        }
    });

    // Mobile: закрытие меню при клике вне его (touchend)
    document.addEventListener('touchend', (e) => {
        // Если тап был вне элементов инвентаря - закрыть меню
        if (UI_ELEMENTS.contextMenu && !UI_ELEMENTS.contextMenu.classList.contains('hidden')) {
            if (e.target.closest('.inventory-slot') === null && 
                !UI_ELEMENTS.contextMenu.contains(e.target)) {
                TooltipManager.hideContextMenu();
            }
        }
        if (UI_ELEMENTS.tooltip && !UI_ELEMENTS.tooltip.classList.contains('hidden')) {
            if (e.target.closest('.inventory-slot') === null && 
                !UI_ELEMENTS.tooltip.contains(e.target)) {
                TooltipManager.hide();
            }
        }
        if (UI_ELEMENTS.auctionBottomSheet && !UI_ELEMENTS.auctionBottomSheet.classList.contains('hidden')) {
            if (e.target.closest('#auction-bottom-sheet') === null &&
                e.target.closest('.auction-slot') === null) {
                AuctionManager.hideBottomSheet();
            }
        }
        if (UI_ELEMENTS.sideMenu &&
            !UI_ELEMENTS.sideMenu.classList.contains('hidden') &&
            e.target.closest('#side-menu') === null &&
            e.target.closest('#sidebar-toggle') === null) {
            closeSideMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && UI_ELEMENTS.sideMenu && !UI_ELEMENTS.sideMenu.classList.contains('hidden')) {
            closeSideMenu();
        }
    });
}

async function init() {
    // Инициализируем модули
    Log.init(UI_ELEMENTS.log);
    UIManager.init(UI_ELEMENTS);
    if (typeof AuctionManager !== 'undefined' && AuctionManager.init) {
        AuctionManager.init(UI_ELEMENTS);
    }
    
    // Убедитесь что tooltip и contextMenu имеют класс hidden по умолчанию
    // (они уже имеют его в HTML, но проверим для надёжности)
    if (UI_ELEMENTS.tooltip && !UI_ELEMENTS.tooltip.classList.contains('hidden')) {
        UI_ELEMENTS.tooltip.classList.add('hidden');
    }
    if (UI_ELEMENTS.contextMenu && !UI_ELEMENTS.contextMenu.classList.contains('hidden')) {
        UI_ELEMENTS.contextMenu.classList.add('hidden');
    }

    // Загружаем игру с константами и инициализируем (включает initializeEventHandlers)
    await initializeGame();
}

// Запуск игры при загрузке
document.addEventListener('DOMContentLoaded', init);
