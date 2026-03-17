/**
 * Combat Module - Логика боевки с рыбой
 */

const CombatManager = {
    currentFish: null,
    isStriking: false,

    show(fishData, combatScreen) {
        this.currentFish = fishData;
        combatScreen.classList.remove('hidden');
        
        // Обновляем информацию о рыбе
        const fishEmoji = document.getElementById('combat-fish-emoji');
        const fishName = document.getElementById('combat-fish-name');
        const hpFill = document.getElementById('combat-hp-fill');
        const hpText = document.getElementById('combat-hp-text');
        
        if (fishEmoji) fishEmoji.innerText = fishData.emoji || '🐟';
        if (fishName) fishName.innerText = fishData.fish_name || 'Рыба';
        if (hpFill) hpFill.style.width = '100%';
        if (hpText) hpText.innerText = `${fishData.hp}/${fishData.max_hp}`;
        
        if (fishData.is_crit) {
            Log.success(`🎯 КРИТ! 2.5x к награде!`);
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
            hpFillElement.style.width = percentage + '%';
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
        
        // Удаляем элемент после анимации
        setTimeout(() => damageDisplay.remove(), 600);
    },

    showVictory(data, uiElements) {
        // Показываем лог с наградой
        Log.show(
            `Победа! ${this.currentFish.emoji} <b>${this.currentFish.fish_name}</b> - награда: +${data.reward} 💰`,
            `rarity-${this.currentFish.display_rarity}`
        );

        // Закрываем экран боевки
        this.hide(uiElements.combatScreen);
        
        // Показываем основной контент
        if (uiElements.main) uiElements.main.style.display = 'block';
        if (uiElements.rodPanel) uiElements.rodPanel.style.display = 'block';

        // Обновляем баланс
        UIManager.updateBalance(data.balance);

        // Проверяем новые достижения
        if (data.new_achievements && data.new_achievements.length > 0) {
            data.new_achievements.forEach(ach => {
                Log.achievement(ach.name);
            });
        }

        // Хапик обратной связи
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('success');
        }
    },

    showVictoryWithFish(fish, data, uiElements) {
        // Показываем лог с наградой (для автоловки когда currentFish может быть null)
        Log.show(
            `Победа! ${fish.emoji} <b>${fish.fish_name}</b> - награда: +${data.reward} 💰`,
            `rarity-${fish.display_rarity}`
        );

        // Показываем основной контент
        if (uiElements.main) uiElements.main.style.display = 'block';
        if (uiElements.rodPanel) uiElements.rodPanel.style.display = 'block';

        // Обновляем баланс
        UIManager.updateBalance(data.balance);

        // Проверяем новые достижения
        if (data.new_achievements && data.new_achievements.length > 0) {
            data.new_achievements.forEach(ach => {
                Log.achievement(ach.name);
            });
        }

        // Хапик обратной связи
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('success');
        }
    }
};
