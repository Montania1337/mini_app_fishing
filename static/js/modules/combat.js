/**
 * Combat Module - logic for fish combat and victory handling.
 */

const CombatManager = {
    currentFish: null,
    isStriking: false,

    show(fishData, combatScreen) {
        this.currentFish = fishData;
        combatScreen.classList.remove('hidden');

        const fishEmoji = document.getElementById('combat-fish-emoji');
        const fishName = document.getElementById('combat-fish-name');
        const hpFill = document.getElementById('combat-hp-fill');
        const hpText = document.getElementById('combat-hp-text');

        if (fishEmoji) fishEmoji.innerText = fishData.emoji || '🐟';
        if (fishName) fishName.innerText = fishData.fish_name || 'Рыба';
        if (hpFill) hpFill.style.width = '100%';
        if (hpText) hpText.innerText = `${fishData.hp}/${fishData.max_hp}`;

        if (fishData.is_crit) {
            Log.success('🎯 КРИТ! 2.5x к награде!');
        }
    },

    hide(combatScreen) {
        combatScreen.classList.add('hidden');
        this.currentFish = null;
        this.isStriking = false;
    },

    updateHP(hp, maxHp, hpFillElement, hpTextElement) {
        if (hpFillElement) {
            const percentage = (hp / maxHp) * 100;
            hpFillElement.style.width = `${percentage}%`;
        }

        if (hpTextElement) {
            hpTextElement.innerText = `${hp}/${maxHp}`;
        }
    },

    showDamage(damage, container) {
        const damageDisplay = document.createElement('div');
        damageDisplay.className = 'damage-display';
        damageDisplay.innerHTML = `<div class="damage-number">-${damage}</div>`;
        container.appendChild(damageDisplay);

        setTimeout(() => damageDisplay.remove(), 600);
    },

    buildVictoryHtml(fish, reward, options = {}) {
        const { isAutoCatch = false } = options;
        const rarityLabel = isAutoCatch
            ? `${fish.display_rarity} ⚡`
            : fish.display_rarity;

        return `
            <div class="log-content">
                <div class="log-icon">${fish.emoji}</div>

                <div class="log-info">
                    <div class="log-title">
                        <b>${fish.fish_name}</b>
                    </div>

                    <div class="log-meta">
                        <span class="rarity">${rarityLabel}</span>
                        <span class="reward">+${reward} 💰</span>
                    </div>
                </div>
            </div>
        `;
    },

    applyVictoryEffects(data, uiElements, options = {}) {
        const { hideCombatScreen = false } = options;

        if (hideCombatScreen) {
            this.hide(uiElements.combatScreen);
        }

        if (uiElements.main) uiElements.main.style.display = 'block';
        if (uiElements.rodPanel) uiElements.rodPanel.style.display = 'block';

        if (data.balance !== undefined) {
            UIManager.updateBalance(data.balance);
        }

        if (data.new_achievements && data.new_achievements.length > 0) {
            data.new_achievements.forEach((ach) => {
                Log.achievement(ach.name);
            });
        }

        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('success');
        }
    },

    completeVictory(fish, data, uiElements, options = {}) {
        if (!fish) {
            console.warn('CombatManager.completeVictory called without fish data');
            return;
        }

        Log.show(
            this.buildVictoryHtml(fish, data.reward || 0, options),
            `rarity-${fish.display_rarity}`
        );

        this.applyVictoryEffects(data, uiElements, options);
    },

    showVictory(data, uiElements) {
        this.completeVictory(this.currentFish, data, uiElements, {
            hideCombatScreen: true
        });
    },

    showAutoCatchVictory(fish, data, uiElements) {
        this.completeVictory(fish, data, uiElements, {
            isAutoCatch: true
        });
    }
};
