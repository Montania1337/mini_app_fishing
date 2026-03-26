/**
 * Tooltip Module - Управление tooltip и контекстным меню
 */

const TooltipManager = {
    currentTooltip: null,
    currentContextMenu: null,

    showRodTooltip(rod, event, tooltipElement) {
        if (!tooltipElement) {
            console.warn('TooltipManager: tooltipElement не найден');
            return;
        }

        const properties = typeof rod.properties === 'string' ? JSON.parse(rod.properties) : (rod.properties || {});
        const damage = RodManager.calculateEffectiveDamage(rod);
        
        let statsHTML = '';
        const propOrder = ['reward', 'xp', 'luck', 'speed', 'power', 'piercing', 'crit'];
        
        for (const prop of propOrder) {
            if (prop in properties) {
                const tier = properties[prop];
                const tier_desc = tier <= 3 ? 'низкий' : (tier <= 6 ? 'средний' : 'высокий');
                const value = RodManager.formatPropertyValue(prop, tier);
                const desc = window.ROD_PROPERTY_DESCRIPTIONS[prop] || '';
                const name = window.ROD_PROPERTY_NAMES[prop] || prop;
                
                statsHTML += `
                    <div class="tooltip-stat-item">
                        <div class="tooltip-stat-title">
                            <span>${name}</span>
                            <span class="tooltip-stat-value">${value}</span>
                        </div>
                        <div class="tooltip-stat-tier">Уровень ${tier}/10 (${tier_desc})</div>
                        <div class="tooltip-stat-desc">${desc}</div>
                    </div>
                `;
            }
        }

        const damageDisplay = `${damage.effective.min}-${damage.effective.max}`;
        const upgradeLevel = rod.upgrade_level || 0;
        const upgradeDisplay = upgradeLevel > 0 ? `+${upgradeLevel}` : 'не улучшена';
        const upgradeColor = upgradeLevel >= 10 ? '#ffd700' : (upgradeLevel >= 7 ? '#ff6b6b' : 'rgba(255,255,255,0.6)');

        const html = `
            <div class="tooltip-header">
                <h3 class="tooltip-name rarity-${rod.rarity}">${rod.name}</h3>
                <div class="tooltip-damage" style="margin-top: 8px; color: #ff6b6b; font-weight: 600; font-size: 0.95em;">
                    💥 Урон: ${damageDisplay}
                </div>
                <div style="margin-top: 6px; font-size: 0.9em; color: ${upgradeColor};">
                    ⬆️ Улучшение: ${upgradeDisplay}
                </div>
            </div>
            <div class="tooltip-stats rarity-${rod.rarity}">
                <div class="tooltip-stat-header">Характеристики</div>
                ${statsHTML}
            </div>

        `;

        tooltipElement.innerHTML = html;
        // Сначала удаляем класс hidden (у него !important)
        tooltipElement.classList.remove('hidden');
        // Z-index уже установлен в CSS (20000), не переопределяем его
        this.currentTooltip = tooltipElement;
        
        // Позиционируем tooltip
        this.positionTooltip(tooltipElement, event);
    },

    positionTooltip(tooltipElement, event) {
        const rect = event.target.getBoundingClientRect();
        const tooltipWidth = tooltipElement.offsetWidth || 250;
        const tooltipHeight = tooltipElement.offsetHeight || 200;
        
        // Безопасные зоны от краёв экрана (в пиксели)
        const margin = 10;
        const headerHeight = 86; // Высота header'a (см. #app padding-top)

        let left = rect.right + 10;
        let top = rect.top - tooltipHeight / 2;

        // Если tooltip выходит влево - позиционируем справа
        if (left < margin) {
            left = rect.right + 10;
        }
        
        // Если tooltip выходит вправо - сдвигаем влево
        if (left + tooltipWidth > window.innerWidth - margin) {
            left = window.innerWidth - tooltipWidth - margin;
        }
        
        // Если tooltip выходит влево (после корректировки) - позиционируем справа
        if (left < margin) {
            left = rect.left - tooltipWidth - 10;
        }

        // Если tooltip всё ещё слишком далеко влево - ограничиваем
        if (left < margin) {
            left = margin;
        }

        // Проверяем верхнюю границу (header)
        if (top < headerHeight + margin) {
            top = headerHeight + margin;
        }
        
        // Проверяем нижнюю границу
        if (top + tooltipHeight > window.innerHeight - margin) {
            top = window.innerHeight - tooltipHeight - margin;
        }

        tooltipElement.style.left = left + 'px';
        tooltipElement.style.top = top + 'px';
    },

    hide() {
        if (this.currentTooltip) {
            // Используем класс hidden который имеет !important
            this.currentTooltip.classList.add('hidden');
            this.currentTooltip = null;
        }
    },

    showContextMenu(rod, event, contextMenuElement) {
        if (!contextMenuElement) {
            console.warn('[showContextMenu] contextMenuElement не найден!');
            return;
        }

        console.log('[showContextMenu] Показываем меню для:', rod.name, 'event.target:', event.target);

        const html = `
            <div class="context-menu-item" data-action="upgrade">
                ⬆️ Улучшить
            </div>
            <div class="context-menu-item" data-action="auction">
                На аукцион
            </div>
            <div class="context-menu-item" data-action="equip">
                ✅ Надеть
            </div>
            <div class="context-menu-item danger" data-action="delete">
                ✖️ Удалить
            </div>
        `;

        contextMenuElement.innerHTML = html;
        // Удаляем класс hidden перед установкой display
        contextMenuElement.classList.remove('hidden');
        // Z-index уже установлен в CSS (20001), не переопределяем его
        
        this.currentContextMenu = { element: contextMenuElement, rod };

        // Позиционируем меню возле курсора
        const offsetX = 10;
        const offsetY = 10;
        let left = event.clientX + offsetX;
        let top = event.clientY + offsetY;

        // Проверяем, не выходит ли меню за правую границу
        const menuRect = contextMenuElement.getBoundingClientRect();
        if (left + menuRect.width > window.innerWidth - 10) {
            left = event.clientX - menuRect.width - offsetX;
        }

        // Проверяем, не выходит ли меню за нижнюю границу
        if (top + menuRect.height > window.innerHeight - 10) {
            top = event.clientY - menuRect.height - offsetY;
        }
        
        contextMenuElement.style.left = left + 'px';
        contextMenuElement.style.top = top + 'px';
        console.log('[showContextMenu] Меню позиционировано возле курсора на:', left, top);

        // Добавляем обработчики кликов (innerHTML очищает старые listener'ы)
        const items = contextMenuElement.querySelectorAll('.context-menu-item');
        console.log('[showContextMenu] Найдено пунктов меню:', items.length);
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                console.log('[ContextMenu Click] Кликнут пункт:', item.dataset.action);
                e.stopPropagation();
                const action = item.dataset.action;
                console.log('[ContextMenu Click] Вызываем onContextMenuAction:', action);
                this.onContextMenuAction?.(action, rod);
                this.hideContextMenu();
            });
        });

        // Добавляем обработчик mouseover - когда наводим на меню, помечаем что открыто
        this._menuMouseOverHandler = () => {
            console.log('[ContextMenu] Мышка над меню - не прячем');
            this._menuHovered = true;
        };
        // Добавляем обработчик mouseleave - когда уходим с меню, можем его прятать
        this._menuMouseLeaveHandler = () => {
            console.log('[ContextMenu] Мышка ушла с меню - прячем');
            this._menuHovered = false;
            // Прячем меню через небольшую задержку (дать время на клик)
            setTimeout(() => {
                if (!this._menuHovered) {
                    this.hideContextMenu();
                }
            }, 100);
        };

        contextMenuElement.addEventListener('mouseover', this._menuMouseOverHandler);
        contextMenuElement.addEventListener('mouseleave', this._menuMouseLeaveHandler);
    },

    hideContextMenu() {
        if (this.currentContextMenu) {
            this.currentContextMenu.element.classList.add('hidden');
            this.currentContextMenu = null;
        }
    },

    showBottomSheet(rod, bottomSheetElement) {
        if (!bottomSheetElement) {
            console.warn('TooltipManager: bottomSheetElement не найден');
            return;
        }

        console.log('[showBottomSheet] Показываем bottom sheet для:', rod.name);

        // Получаем элементы
        const title = bottomSheetElement.querySelector('#bottom-sheet-title');
        const statsContainer = bottomSheetElement.querySelector('#bottom-sheet-stats');
        const actionButtons = bottomSheetElement.querySelectorAll('.action-btn');

        // Устанавливаем заголовок
        if (title) {
            title.textContent = rod.name;
        }

        // Генерируем характеристики
        const properties = typeof rod.properties === 'string' ? JSON.parse(rod.properties) : (rod.properties || {});
        const damage = RodManager.calculateEffectiveDamage(rod);
        
        let statsHTML = '';
        const propOrder = ['reward', 'xp', 'luck', 'speed', 'power', 'piercing', 'crit'];
        
        // Добавляем урон
        statsHTML += `
            <div class="bottom-sheet-stat-item">
                <div class="bottom-sheet-stat-title">
                    <span>Урон</span>
                    <span class="bottom-sheet-stat-value">${damage.effective.min}-${damage.effective.max}</span>
                </div>
                <div class="bottom-sheet-stat-tier">Уровень улучшения: ${rod.upgrade_level || 0}</div>
            </div>
        `;
        
        // Добавляем остальные свойства
        for (const prop of propOrder) {
            if (prop in properties) {
                const tier = properties[prop];
                const tier_desc = tier <= 3 ? 'низкий' : (tier <= 6 ? 'средний' : 'высокий');
                const value = RodManager.formatPropertyValue(prop, tier);
                const desc = window.ROD_PROPERTY_DESCRIPTIONS[prop] || '';
                const name = window.ROD_PROPERTY_NAMES[prop] || prop;
                
                statsHTML += `
                    <div class="bottom-sheet-stat-item">
                        <div class="bottom-sheet-stat-title">
                            <span>${name}</span>
                            <span class="bottom-sheet-stat-value">${value}</span>
                        </div>
                        <div class="bottom-sheet-stat-tier">Уровень ${tier}/10 (${tier_desc})</div>
                        <div class="bottom-sheet-stat-desc">${desc}</div>
                    </div>
                `;
            }
        }

        statsContainer.innerHTML = statsHTML;

        // Удаляем старые обработчики и добавляем новые
        actionButtons.forEach(btn => {
            const oldBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(oldBtn, btn);
        });

        // Получаем свежие ноды
        const newActionButtons = bottomSheetElement.querySelectorAll('.action-btn');
        newActionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                console.log('[BottomSheet Click] Действие:', action);
                this.onContextMenuAction?.(action, rod);
                this.hideBottomSheet();
            });
        });

        // Показываем bottom sheet
        bottomSheetElement.classList.remove('hidden');
        this.currentBottomSheet = { element: bottomSheetElement, rod };

        // Обработчик свайпа вниз
        let touchStartY = 0;
        const swipeHandler = (e) => {
            if (e.type === 'touchstart') {
                touchStartY = e.touches[0].clientY;
            } else if (e.type === 'touchend') {
                const touchEndY = e.changedTouches[0].clientY;
                const swipeDistance = touchEndY - touchStartY;
                
                // Если свайп вниз больше чем 50px - закрываем
                if (swipeDistance > 50) {
                    console.log('[BottomSheet] Свайп вниз, закрываем');
                    this.hideBottomSheet();
                }
            }
        };

        // Удаляем старые обработчики если были
        bottomSheetElement.removeEventListener('touchstart', this._swipeStartHandler);
        bottomSheetElement.removeEventListener('touchend', this._swipeEndHandler);

        // Сохраняем обработчики для будущего удаления
        this._swipeStartHandler = (e) => swipeHandler(e);
        this._swipeEndHandler = (e) => swipeHandler(e);

        bottomSheetElement.addEventListener('touchstart', this._swipeStartHandler);
        bottomSheetElement.addEventListener('touchend', this._swipeEndHandler);
    },

    hideBottomSheet() {
        if (this.currentBottomSheet) {
            this.currentBottomSheet.element.classList.add('hidden');
            this.currentBottomSheet = null;
        }
    }
}
