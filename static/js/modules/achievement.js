/**
 * Achievement Module - Управление достижениями
 */

const AchievementManager = {
    renderAchievements(achievements, containerElement) {
        if (!containerElement) return;

        achievements.sort((a, b) => (b.is_unlocked ? 1 : 0) - (a.is_unlocked ? 1 : 0));

        let html = '';
        achievements.forEach(ach => {
            const lockedClass = ach.is_unlocked ? '' : 'locked';
            const icon = ach.is_unlocked ? '🏆' : '🔒';
            
            html += `
                <div class="achievement-card ${lockedClass}">
                    <div>
                        <div style="font-size: 1.5em; margin-bottom: 8px;">${icon}</div>
                        <div style="font-weight: 600;">${ach.name}</div>
                        <div style="font-size: 0.85em; color: rgba(255,255,255,0.6); margin-top: 4px;">${ach.desc}</div>
                    </div>
                </div>
            `;
        });

        containerElement.innerHTML = html;
    }
};
