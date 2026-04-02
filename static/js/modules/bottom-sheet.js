/**
 * Bottom Sheet Module - common helpers for mobile bottom sheets.
 */

const BottomSheetManager = {
    _swipeHandlers: new WeakMap(),

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

        const actionElements = this.rebindActions(actions, onAction);

        element.classList.remove('hidden');
        this.bindSwipeToClose(element, onClose);

        return { actionElements };
    },

    hide(element) {
        if (!element) return;
        element.classList.add('hidden');
    }
};
