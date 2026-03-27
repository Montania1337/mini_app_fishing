/**
 * Achievement Module - Управление достижениями
 */

const AchievementManager = {
    formatProgressLabel(achievement) {
        const current = Number(achievement.progress_current ?? 0);
        const target = Number(achievement.progress_target ?? 0);
        const unit = achievement.progress_unit ? ` ${achievement.progress_unit}` : '';

        if (achievement.is_unlocked) {
            return `Выполнено: ${target}/${target}${unit}`;
        }

        return `${Math.min(current, target)}/${target}${unit}`;
    },

    renderAchievements(achievements, containerElement) {
        if (!containerElement) return;

        achievements.sort((a, b) => (b.is_unlocked ? 1 : 0) - (a.is_unlocked ? 1 : 0));

        let html = '';
        achievements.forEach((achievement) => {
            const lockedClass = achievement.is_unlocked ? '' : 'locked';
            const icon = achievement.is_unlocked ? '🏆' : '🔒';
            const progressPercent = Number(achievement.progress_percent ?? 0);
            const progressLabel = this.formatProgressLabel(achievement);

            html += `
                <div class="achievement-card ${lockedClass}">
                    <div class="achievement-icon">${icon}</div>
                    <div class="achievement-content">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.desc}</div>
                        <div class="achievement-progress-meta">
                            <span>Прогресс</span>
                            <span>${progressLabel}</span>
                        </div>
                        <div class="achievement-progress-track">
                            <div class="achievement-progress-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        containerElement.innerHTML = html;
    }
};
