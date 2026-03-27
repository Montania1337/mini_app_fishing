/**
 * Leaderboard Module - Управление лидербордом
 */

const LeaderboardManager = {
    renderLeaderboard(type, leaderboardData, containerElement) {
        if (!containerElement) return;

        const data = leaderboardData[type];
        if (!data || data.length === 0) {
            containerElement.innerHTML = '<p style="text-align: center; padding: 20px;">Пока нет данных</p>';
            return;
        }

        let html = '';
        data.forEach((player, index) => {
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}.`));
            const balance = Number(player.balance ?? 0);
            const totalCaught = Number(player.total_caught ?? 0);
            const maxCatch = Number(player.max_catch ?? 0);
            const value =
                type === 'by_balance' ? `${balance.toLocaleString()} 💰` :
                type === 'by_max_catch' ? `${maxCatch.toLocaleString()} 🐟` :
                `${totalCaught.toLocaleString()} 🎣`;

            html += `
                <div class="leader-item">
                    <div>
                        <span style="font-weight: bold; font-size: 1.1em; margin-right: 8px;">${medal}</span>
                        <span>${player.username || 'Аноним'}</span>
                    </div>
                    <span style="font-weight: 600; color: var(--accent-color);">${value}</span>
                </div>
            `;
        });

        containerElement.innerHTML = html;
    }
};
