/**
 * Toast Module - unified toast notifications for game actions.
 */

const ToastManager = {
    activeToast: null,

    getIcon(type) {
        switch (type) {
            case 'failure':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            case 'success':
            default:
                return '✨';
        }
    },

    normalizeType(type) {
        if (type === 'error') return 'failure';
        return type || 'success';
    },

    triggerHaptic(type) {
        const hapticType = type === 'success'
            ? 'success'
            : (type === 'warning' ? 'warning' : 'error');

        if (window.tg?.HapticFeedback?.notificationOccurred) {
            window.tg.HapticFeedback.notificationOccurred(hapticType);
        }
    },

    hide(toast = this.activeToast) {
        if (!toast || toast.dataset.closing === 'true') {
            return;
        }

        toast.dataset.closing = 'true';
        toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';

        window.setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }

            if (this.activeToast === toast) {
                this.activeToast = null;
            }
        }, 300);
    },

    show(message, options = {}) {
        if (!message) {
            return null;
        }

        const {
            type: rawType = 'success',
            duration = 4000,
            icon = null
        } = options;

        const type = this.normalizeType(rawType);

        if (this.activeToast) {
            this.hide(this.activeToast);
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;

        const iconElement = document.createElement('span');
        iconElement.className = 'toast-icon';
        iconElement.textContent = icon || this.getIcon(type);

        const textElement = document.createElement('div');
        textElement.className = 'toast-text';
        textElement.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Закрыть уведомление');
        closeButton.textContent = '✕';
        closeButton.addEventListener('click', () => this.hide(toast));

        toast.appendChild(iconElement);
        toast.appendChild(textElement);
        toast.appendChild(closeButton);
        document.body.appendChild(toast);

        this.activeToast = toast;
        this.triggerHaptic(type);

        if (duration > 0) {
            window.setTimeout(() => {
                if (document.body.contains(toast)) {
                    this.hide(toast);
                }
            }, duration);
        }

        return toast;
    }
};
