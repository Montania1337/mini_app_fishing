/**
 * Upgrade Module - Управление окном улучшения удочки
 */

const UpgradeManager = {
    currentRod: null,
    upgradeModal: null,
    isUpgrading: false,
    particleCount: 0,

    showToast(message, type = 'success') {
        // Удаляем старое уведомление если есть
        const oldToast = document.querySelector('.toast-notification');
        if (oldToast) {
            oldToast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
            setTimeout(() => oldToast.remove(), 300);
        }

        // Создаём новое уведомление
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✨' : '❌'}</span>
            <div class="toast-text">${message}</div>
            <button class="toast-close">✕</button>
        `;

        document.body.appendChild(toast);

        // Закрытие при клике на крестик
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        });

        // Автоматическое закрытие через 4 секунды
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    },

    init() {
        this.upgradeModal = document.getElementById('upgrade-modal');
        console.log('UpgradeManager.init - upgradeModal найден:', !!this.upgradeModal);
        
        // Обработчик закрытия модали
        const closeBtn = document.getElementById('close-upgrade-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
            console.log('UpgradeManager.init - closeBtn найден и слушатель добавлен');
        }
        
        // Обработчик клика на кнопку улучшения
        const upgradeBtn = document.getElementById('upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.performUpgrade());
            console.log('UpgradeManager.init - upgradeBtn найден и слушатель добавлен');
        }
        
        // Закрытие при клике вне модали
        if (this.upgradeModal) {
            this.upgradeModal.addEventListener('click', (e) => {
                // Только если клик прямо на overlay (фон)
                if (e.target === this.upgradeModal) {
                    this.close();
                }
            });
            console.log('UpgradeManager.init - слушатель клика на модали добавлен');
            
            // Запрещаем пропущение событий нажатия со содержимого модали на фон
            const modalContent = this.upgradeModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
    },

    createParticles(element, color = '#34c759') {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = color;
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '10000';
            particle.style.boxShadow = `0 0 8px ${color}`;
            
            const angle = (i / 8) * Math.PI * 2;
            const velocity = 3 + Math.random() * 2;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            let x = centerX;
            let y = centerY;
            let life = 1;
            
            document.body.appendChild(particle);
            
            const animate = () => {
                x += vx;
                y += vy;
                life -= 0.02;
                
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.opacity = life;
                
                if (life > 0) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            animate();
        }
    },

    open(rod) {
        if (!rod) {
            console.warn('UpgradeManager.open: rod не передан');
            return;
        }
        console.log('UpgradeManager.open вызван для:', rod.name);
        
        this.currentRod = rod;
        const currentLevel = rod.upgrade_level || 0;
        console.log('Текущий уровень:', currentLevel);
        
        // Проверяем, не на ли максимальном уровне
        if (currentLevel >= 10) {
            Log.error('Удочка уже на максимальном уровне улучшения!');
            return;
        }
        console.log('Не максимальный уровень, продолжаем');
        
        const nextLevel = currentLevel + 1;
        console.log('Следующий уровень:', nextLevel);
        
        // Получаем информацию об улучшении из конфига
        const upgradeInfo = window.ROD_UPGRADE_SYSTEM?.[nextLevel];
        console.log('upgradeInfo:', upgradeInfo);
        if (!upgradeInfo) {
            Log.error('Информация об улучшении не найдена');
            console.error('ROD_UPGRADE_SYSTEM:', window.ROD_UPGRADE_SYSTEM);
            return;
        }
        console.log('Информация об улучшении найдена');
        
        // Вычисляем урон до и после
        console.log('Вычисляем урон...');
        const damageBeforeUpgrade = RodManager.calculateEffectiveDamage(rod);
        console.log('Урон до:', damageBeforeUpgrade);
        const damageAfterSimulated = {
            effective: {
                min: damageBeforeUpgrade.effective.min + upgradeInfo.damage_bonus,
                max: damageBeforeUpgrade.effective.max + upgradeInfo.damage_bonus
            }
        };
        console.log('Урон после:', damageAfterSimulated);
        
        // Обновляем элементы модали
        console.log('Обновляем элементы модали...');
        document.getElementById('upgrade-rod-name').textContent = rod.name;
        document.getElementById('upgrade-level-current').textContent = currentLevel;
        document.getElementById('upgrade-level-next').textContent = nextLevel;
        
        document.getElementById('upgrade-damage-current').textContent = 
            `${damageBeforeUpgrade.effective.min}-${damageBeforeUpgrade.effective.max}`;
        document.getElementById('upgrade-damage-next').textContent = 
            `${damageAfterSimulated.effective.min}-${damageAfterSimulated.effective.max}`;
        
        document.getElementById('upgrade-cost').textContent = upgradeInfo.cost;
        document.getElementById('upgrade-chance').textContent = `${upgradeInfo.success_chance}%`;
        console.log('Элементы модали обновлены');
        
        // Очищаем результат предыдущего улучшения
        const resultDiv = document.getElementById('upgrade-result');
        resultDiv.classList.add('hidden');
        resultDiv.classList.remove('success', 'failure');
        
        // Показываем модаль
        console.log('Показываем модаль улучшения');
        this.upgradeModal.classList.remove('hidden');
        console.log('Модаль показана, classList:', this.upgradeModal?.classList.toString());
        
        // Сбрасываем флаг
        this.isUpgrading = false;
        document.getElementById('upgrade-btn').disabled = false;
        document.getElementById('upgrade-btn').classList.remove('upgrading');
    },

    async performUpgrade() {
        if (!this.currentRod || this.isUpgrading) {
            console.warn('UpgradeManager.performUpgrade: нет текущей удочки или уже идёт улучшение');
            return;
        }
        console.log('UpgradeManager.performUpgrade вызван для:', this.currentRod);
        const upgradeBtn = document.getElementById('upgrade-btn');
        upgradeBtn.disabled = true;
        this.isUpgrading = true;
        upgradeBtn.classList.add('upgrading');

        try {
            // Отправляем запрос на улучшение
            const result = await API.upgradeRod(this.currentRod.id);
            console.log('Результат улучшения:', result);
            console.log('result.rod перед обновлением:', result.rod);

            // Обновляем удочку в текущем состоянии с данными с сервера
            // ОСТОРОЖНО: обновляем только критические поля из БД
            this.currentRod.upgrade_level = result.level;
            if (result.rod) {
                this.currentRod.min_damage = result.rod.min_damage;
                this.currentRod.max_damage = result.rod.max_damage;
                // Убедимся что properties скопированы правильно
                if (result.rod.properties) {
                    this.currentRod.properties = result.rod.properties;
                }
            }
            console.log('currentRod после обновления:', this.currentRod);

            // Проверяем что damage_min и damage_max существуют
            const damageMin = result.damage_min || 0;
            const damageMax = result.damage_max || 0;

            if (result.success) {
                // ✨ Успешное улучшение
                console.log('Улучшение успешно:', result.message);
                
                // Показываем toast уведомление
                this.showToast(`✨ ${result.message}`, 'success');
                
                // Обновляем информацию в модали для следующего уровня
                setTimeout(() => {
                    // Пересчитываем урон на основе обновленного currentRod и RodManager
                    const currentDamage = RodManager.calculateEffectiveDamage(this.currentRod);
                    console.log('После успеха - currentRod:', this.currentRod);
                    console.log('После успеха - currentDamage:', currentDamage);
                    
                    // Обновляем левую часть (текущий урон после успешного улучшения)
                    document.getElementById('upgrade-damage-current').textContent = 
                        `${currentDamage.effective.min}-${currentDamage.effective.max}`;
                    document.getElementById('upgrade-level-current').textContent = result.level;
                    console.log('Обновлена левая часть:', `${currentDamage.effective.min}-${currentDamage.effective.max}`);
                    
                    // Вычисляем прогноз урона для СЛЕДУЮЩЕГО уровня (если он есть)
                    if (result.level < 10) {
                        const nextLevel = result.level + 1;
                        document.getElementById('upgrade-level-next').textContent = nextLevel;
                        
                        const nextUpgradeInfo = window.ROD_UPGRADE_SYSTEM?.[nextLevel];
                        if (nextUpgradeInfo) {
                            const nextDamageMin = currentDamage.effective.min + nextUpgradeInfo.damage_bonus;
                            const nextDamageMax = currentDamage.effective.max + nextUpgradeInfo.damage_bonus;
                            document.getElementById('upgrade-damage-next').textContent = `${nextDamageMin}-${nextDamageMax}`;
                            document.getElementById('upgrade-cost').textContent = nextUpgradeInfo.cost;
                            document.getElementById('upgrade-chance').textContent = `${nextUpgradeInfo.success_chance}%`;
                        }
                    } else {
                        // Максимальный уровень достигнут
                        document.getElementById('upgrade-level-next').textContent = '—';
                        document.getElementById('upgrade-damage-next').textContent = '—';
                        document.getElementById('upgrade-cost').textContent = '—';
                        document.getElementById('upgrade-chance').textContent = '—';
                    }
                    
                    // Флеш анимация для левой части (которая теперь обновилась)
                    const damageCurrentElement = document.getElementById('upgrade-damage-current');
                    damageCurrentElement.style.animation = 'none';
                    setTimeout(() => {
                        damageCurrentElement.style.animation = 'upgradeSuccessFlash 0.7s ease';
                    }, 10);
                }, 100);
            } else {
                // ❌ Улучшение провалилось
                console.log('Улучшение провалилось:', result.message);
                
                // Показываем toast уведомление
                this.showToast(`❌ ${result.message}`, 'failure');
                
                // После неудачи оставляем урон без изменений (он останется прежним "ДО")
            }

            // Обновляем UI во всех местах
            setTimeout(async () => {
                // Обновляем баланс
                if (typeof GameState !== 'undefined') {
                    GameState.balance = result.balance;
                    if (typeof UIManager !== 'undefined') {
                        UIManager.updateBalance(result.balance);
                    }
                }
                
                // Перезагружаем инвентарь с сервера
                try {
                    const loginData = await API.login();
                    GameState.rods = loginData.rods || [];
                    GameState.activeRod = loginData.active_rod;
                    
                    // Обновляем currentRod из свежих данных с сервера
                    const updatedRod = GameState.rods.find(r => r.id === this.currentRod.id);
                    if (updatedRod) {
                        console.log('После загрузки инвентаря - updatedRod:', updatedRod);
                        this.currentRod = updatedRod;
                        
                        // ВАЖНО: пересчитываем и обновляем отображение урона в модали
                        // на основе свежих данных с сервера
                        if (result.success && this.currentRod.upgrade_level < 10) {
                            const currentDamage = RodManager.calculateEffectiveDamage(this.currentRod);
                            console.log('После инвентаря - currentRod:', this.currentRod);
                            console.log('После инвентаря - currentDamage:', currentDamage);
                            const nextLevel = this.currentRod.upgrade_level + 1;
                            const nextUpgradeInfo = window.ROD_UPGRADE_SYSTEM?.[nextLevel];
                            
                            // Обновляем левую часть (текущий урон)
                            document.getElementById('upgrade-damage-current').textContent = 
                                `${currentDamage.effective.min}-${currentDamage.effective.max}`;
                            console.log('Обновлена левая часть после инвентаря:', `${currentDamage.effective.min}-${currentDamage.effective.max}`);
                            
                            // Обновляем правую часть (прогноз для следующего уровня)
                            if (nextUpgradeInfo) {
                                const nextDamageMin = currentDamage.effective.min + nextUpgradeInfo.damage_bonus;
                                const nextDamageMax = currentDamage.effective.max + nextUpgradeInfo.damage_bonus;
                                document.getElementById('upgrade-damage-next').textContent = 
                                    `${nextDamageMin}-${nextDamageMax}`;
                                document.getElementById('upgrade-cost').textContent = nextUpgradeInfo.cost;
                                document.getElementById('upgrade-chance').textContent = `${nextUpgradeInfo.success_chance}%`;
                            }
                        } else if (result.success && this.currentRod.upgrade_level >= 10) {
                            // Максимальный уровень достигнут
                            document.getElementById('upgrade-level-next').textContent = '—';
                            document.getElementById('upgrade-damage-next').textContent = '—';
                            document.getElementById('upgrade-cost').textContent = '—';
                            document.getElementById('upgrade-chance').textContent = '—';
                        }
                    }
                    
                    if (typeof InventoryManager !== 'undefined' && UI_ELEMENTS?.invGrid) {
                        InventoryManager.renderInventoryGrid(GameState.rods, UI_ELEMENTS.invGrid);
                    }
                    
                    if (typeof RodManager !== 'undefined' && UI_ELEMENTS?.rodInfo) {
                        RodManager.renderRodInfo(GameState.activeRod, UI_ELEMENTS.rodInfo);
                    }
                } catch (e) {
                    console.warn('Ошибка при обновлении инвентаря:', e);
                }
                
                // Обновляем информацию о удочке в логе
                Log.success(`⬆️ Удочка "${this.currentRod.name}" теперь уровня ${result.level}`);
            }, 1200);

            upgradeBtn.classList.remove('upgrading');
            upgradeBtn.disabled = false;
            this.isUpgrading = false;
        } catch (e) {
            console.error('Ошибка при улучшении:', e);
            this.showToast(`⚠️ Ошибка: ${e.message}`, 'failure');
            
            upgradeBtn.classList.remove('upgrading');
            upgradeBtn.disabled = false;
            this.isUpgrading = false;
        }
    },

    close() {
        if (this.upgradeModal) {
            this.upgradeModal.classList.add('hidden');
            this.currentRod = null;
        }
    }
};
