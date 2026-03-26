/**
 * Log Module - Система логирования событий
 */

const Log = {
    init(logElement) {
        this.logElement = logElement;
    },

    show(text, type = 'info') {
        if (!this.logElement) return;
        
        const li = document.createElement('li');
        li.className = `log-item ${type}`;

        const time = new Date().toLocaleTimeString();

        li.innerHTML = `
            <div class="log-time">${time}</div>
            ${text}
        `;

        this.logElement.prepend(li);
        
        if (this.logElement.children.length > 20) {
            this.logElement.lastChild.remove();
        }
    },

    success(text) {
        this.show(text, 'success');
    },

    error(text) {
        this.show(text, 'error');
    },

    warning(text) {
        this.show(text, 'warning');
    },

    info(text) {
        this.show(text, 'info');
    },

    achievement(achievementName) {
        this.show(`🏆 Достижение разблокировано: ${achievementName}!`, 'success');
    }
};
