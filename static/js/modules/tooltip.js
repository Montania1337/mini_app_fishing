/**
 * Tooltip Module - управление tooltip, контекстным меню и mobile bottom sheet.
 */
// import {propOrder} from './constants.js'

const TooltipManager = {
    currentTooltip: null,
    currentContextMenu: null,
    currentBottomSheet: null,

    showRodTooltip(rod, event, tooltipElement) {
        if (!tooltipElement) {
            console.warn('TooltipManager: tooltipElement не найден');
            return;
        }

        tooltipElement.innerHTML = RodManager.buildTooltipHTML(rod);

        tooltipElement.classList.remove('hidden');
        this.currentTooltip = tooltipElement;
        this.positionTooltip(tooltipElement, event);
    },

    positionTooltip(tooltipElement, event) {
        const targetElement = event.currentTarget || event.target;
        const rect = targetElement.getBoundingClientRect();
        const tooltipWidth = tooltipElement.offsetWidth || 250;
        const tooltipHeight = tooltipElement.offsetHeight || 200;
        const margin = 10;
        const headerHeight = 86;
        const offset = 12;
        const spaceRight = window.innerWidth - rect.right - margin;
        const spaceLeft = rect.left - margin;

        let left;
        let top = rect.top - tooltipHeight / 2;

        // Если справа места мало, сразу уводим tooltip влево от слота,
        // чтобы он не налезал на ячейку и не вызывал hover-мигание.
        if (spaceRight >= tooltipWidth + offset || spaceRight >= spaceLeft) {
            left = rect.right + offset;
        } else {
            left = rect.left - tooltipWidth - offset;
        }

        if (left + tooltipWidth > window.innerWidth - margin) {
            left = window.innerWidth - tooltipWidth - margin;
        }

        if (left < margin) {
            left = margin;
        }

        if (top < headerHeight + margin) {
            top = headerHeight + margin;
        }

        if (top + tooltipHeight > window.innerHeight - margin) {
            top = window.innerHeight - tooltipHeight - margin;
        }

        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.top = `${top}px`;
    },

    hide() {
        if (this.currentTooltip) {
            this.currentTooltip.classList.add('hidden');
            this.currentTooltip = null;
        }
    },

    showContextMenu(rod, event, contextMenuElement) {
        if (!contextMenuElement) {
            console.warn('[showContextMenu] contextMenuElement не найден');
            return;
        }

        console.log('[showContextMenu] Показываем меню для:', rod.name, 'event.target:', event.target);

        contextMenuElement.innerHTML = `
            <div class="context-menu-item" data-action="upgrade">
                ⬆️ Улучшить
            </div>
            <div class="context-menu-item" data-action="auction">
                ⚖️ На аукцион
            </div>
            <div class="context-menu-item" data-action="equip">
                ✅ Надеть
            </div>
            <div class="context-menu-item danger" data-action="delete">
                ✖️ Удалить
            </div>
        `;

        contextMenuElement.classList.remove('hidden');
        this.currentContextMenu = { element: contextMenuElement, rod };

        const offsetX = 10;
        const offsetY = 10;
        let left = event.clientX + offsetX;
        let top = event.clientY + offsetY;

        const menuRect = contextMenuElement.getBoundingClientRect();
        if (left + menuRect.width > window.innerWidth - 10) {
            left = event.clientX - menuRect.width - offsetX;
        }

        if (top + menuRect.height > window.innerHeight - 10) {
            top = event.clientY - menuRect.height - offsetY;
        }

        contextMenuElement.style.left = `${left}px`;
        contextMenuElement.style.top = `${top}px`;

        const items = contextMenuElement.querySelectorAll('.context-menu-item');
        items.forEach((item) => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                this.onContextMenuAction?.(action, rod);
                this.hideContextMenu();
            });
        });

        this._menuMouseOverHandler = () => {
            this._menuHovered = true;
        };

        this._menuMouseLeaveHandler = () => {
            this._menuHovered = false;
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

        const title = bottomSheetElement.querySelector('#bottom-sheet-title');
        const statsContainer = bottomSheetElement.querySelector('#bottom-sheet-stats');
        const actionButtons = Array.from(bottomSheetElement.querySelectorAll('.action-btn')).map((button) => ({
            element: button,
            id: button.dataset.action,
            danger: button.classList.contains('danger')
        }));

        BottomSheetManager.show({
            element: bottomSheetElement,
            titleElement: title,
            title: rod.name || 'Удочка',
            statsElement: statsContainer,
            statsHTML: RodManager.buildBottomSheetStatsHTML(rod),
            actions: actionButtons,
            onAction: (action, event) => {
                event.stopPropagation();
                this.onContextMenuAction?.(action, rod);
                this.hideBottomSheet();
            },
            onClose: () => this.hideBottomSheet()
        });

        this.currentBottomSheet = { element: bottomSheetElement, rod };
    },

    hideBottomSheet() {
        if (this.currentBottomSheet) {
            BottomSheetManager.hide(this.currentBottomSheet.element);
            this.currentBottomSheet = null;
        }
    }
};
