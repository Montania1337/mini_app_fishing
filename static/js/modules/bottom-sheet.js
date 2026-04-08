/**
 * Bottom Sheet Module - common helpers for mobile bottom sheets.
 */

const BottomSheetManager = {
    _swipeHandlers: new WeakMap(),
    _infoHandlers: new WeakMap(),

    updateContent({
        titleElement,
        title = '',
        metaElement = null,
        metaHTML = '',
        statsElement = null,
        statsHTML = ''
    }) {
        if (titleElement) {
            titleElement.textContent = title;
        }

        if (metaElement) {
            metaElement.innerHTML = metaHTML || '';
            metaElement.classList.toggle('hidden', !metaHTML);
        }

        if (statsElement) {
            statsElement.innerHTML = statsHTML || '';
        }
    },

    rebindActions(actions = [], onAction) {
        return actions
            .filter((action) => action?.element?.parentNode)
            .map((action) => {
                const {
                    element,
                    id,
                    label = element.textContent,
                    danger = element.classList.contains('danger')
                } = action;

                const nextElement = element.cloneNode(true);

                if (element.id) {
                    nextElement.id = element.id;
                }

                if (id) {
                    nextElement.dataset.action = id;
                }

                if (label !== undefined) {
                    nextElement.textContent = label;
                }

                nextElement.className = danger ? 'action-btn danger' : 'action-btn';

                element.parentNode.replaceChild(nextElement, element);

                if (typeof onAction === 'function') {
                    nextElement.addEventListener('click', (event) => onAction(id, event));
                }

                return nextElement;
            });
    },

    bindSwipeToClose(element, onClose) {
        if (!element) return;

        const existingHandlers = this._swipeHandlers.get(element);
        if (existingHandlers) {
            element.removeEventListener('touchstart', existingHandlers.start);
            element.removeEventListener('touchend', existingHandlers.end);
        }

        let touchStartY = 0;

        const start = (event) => {
            touchStartY = event.touches[0].clientY;
        };

        const end = (event) => {
            const touchEndY = event.changedTouches[0].clientY;
            if (touchEndY - touchStartY > 50) {
                onClose?.();
            }
        };

        element.addEventListener('touchstart', start, { passive: true });
        element.addEventListener('touchend', end, { passive: true });
        this._swipeHandlers.set(element, { start, end });
    },

    ensureInfoPopup(element) {
        if (!element) return null;

        let popup = element.querySelector('[data-bottom-sheet-info]');
        if (popup) {
            return popup;
        }

        popup = document.createElement('div');
        popup.className = 'bottom-sheet-info hidden';
        popup.dataset.bottomSheetInfo = 'true';
        popup.innerHTML = `
            <div class="bottom-sheet-info-card" role="dialog" aria-modal="false">
                <div class="bottom-sheet-info-header">
                    <div>
                        <div class="bottom-sheet-info-title"></div>
                        <div class="bottom-sheet-info-tier hidden"></div>
                    </div>
                    <button type="button" class="btn-close bottom-sheet-info-close" data-bottom-sheet-close-info>✕</button>
                </div>
                <div class="bottom-sheet-info-text"></div>
            </div>
        `;

        popup.addEventListener('click', (event) => {
            if (event.target === popup || event.target.closest('[data-bottom-sheet-close-info]')) {
                this.hideInfoPopup(element);
            }
        });

        const content = element.querySelector('.bottom-sheet-content') || element;
        content.appendChild(popup);
        return popup;
    },

    showInfoPopup(element, { title = '', description = '', tier = '' } = {}) {
        const popup = this.ensureInfoPopup(element);
        if (!popup) return;

        const titleElement = popup.querySelector('.bottom-sheet-info-title');
        const textElement = popup.querySelector('.bottom-sheet-info-text');
        const tierElement = popup.querySelector('.bottom-sheet-info-tier');

        if (titleElement) {
            titleElement.textContent = title || 'Свойство';
        }

        if (textElement) {
            textElement.textContent = description || 'Описание пока недоступно.';
        }

        if (tierElement) {
            tierElement.textContent = tier ? `Уровень ${tier}/10` : '';
            tierElement.classList.toggle('hidden', !tier);
        }

        popup.classList.remove('hidden');
    },

    hideInfoPopup(element) {
        const popup = element?.querySelector('[data-bottom-sheet-info]');
        if (popup) {
            popup.classList.add('hidden');
        }
    },

    bindStatInfo(element, statsElement) {
        if (!element || !statsElement) return;

        const existingHandler = this._infoHandlers.get(statsElement);
        if (existingHandler) {
            statsElement.removeEventListener('click', existingHandler);
        }

        const handler = (event) => {
            const trigger = event.target.closest('.bottom-sheet-affix');
            if (!trigger || !statsElement.contains(trigger)) return;

            const title = trigger.dataset.affixName || 'Свойство';
            const description = trigger.dataset.affixDesc || '';
            const tier = trigger.dataset.tier || '';

            this.showInfoPopup(element, { title, description, tier });
        };

        statsElement.addEventListener('click', handler);
        this._infoHandlers.set(statsElement, handler);
    },

    show({
        element,
        titleElement,
        title = '',
        metaElement = null,
        metaHTML = '',
        statsElement = null,
        statsHTML = '',
        actions = [],
        onAction = null,
        onClose = null
    }) {
        if (!element) {
            return { actionElements: [] };
        }

        this.updateContent({
            titleElement,
            title,
            metaElement,
            metaHTML,
            statsElement,
            statsHTML
        });

        if (statsElement) {
            this.bindStatInfo(element, statsElement);
        }

        const actionElements = this.rebindActions(actions, onAction);

        this.hideInfoPopup(element);
        element.classList.remove('hidden');
        this.bindSwipeToClose(element, onClose);

        return { actionElements };
    },

    hide(element) {
        if (!element) return;
        this.hideInfoPopup(element);
        element.classList.add('hidden');
    }
};
