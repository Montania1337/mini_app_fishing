/**
 * Inventory Module - Управление инвентарем и сеткой удочек
 */

const InventoryManager = {
    rods: [],
    draggedRod: null,
    touchTracker: {}, // Отслеживание касаний для долгого нажатия

    renderInventoryGrid(rods, invGridElement) {
        if (!invGridElement) return;

        this.rods = rods;
        const maxSlots = 21; // 7x3 grid
        
        let html = '';
        
        for (let i = 0; i < maxSlots; i++) {
            const rod = rods[i];
            
            if (rod) {
                const properties = typeof rod.properties === 'string' ? JSON.parse(rod.properties) : (rod.properties || {});
                const durability = rod.durability !== undefined ? rod.durability : 0;
                const gearScore = rod.gear_score !== undefined ? rod.gear_score : 0;
                
                let durabilityClass = 'durability-high';
                if (durability <= 10) durabilityClass = 'durability-low';
                else if (durability <= 50) durabilityClass = 'durability-medium';
                
                const durabilitySymbol = durability === -1 ? '♾️' : durability;
                
                html += `
                    <div class="inventory-slot ${rod.is_active ? 'active' : ''}" data-index="${i}" data-rod-id="${rod.id}">
                        <div class="item-icon">${rod.emoji || '🎣'}</div>
                        <div class="item-name">${rod.name}</div>
                        <div class="item-durability durability-${durabilityClass}">${durabilitySymbol}</div>
                        <div class="item-gear-score">⚙️ ${gearScore}</div>
                    </div>
                `;
            } else {
                html += `<div class="inventory-slot empty" data-index="${i}"></div>`;
            }
        }
        
        invGridElement.innerHTML = html;
        this.setupSlotListeners(invGridElement);
    },

    setupSlotListeners(invGridElement) {
        if (!invGridElement) return;

        const slots = invGridElement.querySelectorAll('.inventory-slot');
        
        slots.forEach((slot, index) => {
            const slotId = slot.dataset.rodId || `slot-${index}`;

            // ===== CLICK Event (все устройства) + Double-tap detection =====
            let lastTime = 0;
            let singleClickTimeout = null;
            let wasDoubleTap = false;
            
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                // Если это была долгая нажатие (long-press), игнорируем клик
                if (this.touchTracker[slotId]?.wasLongPress) {
                    this.touchTracker[slotId].wasLongPress = false;
                    return;
                }
                
                if (slot.classList.contains('empty')) return;

                const rodId = slot.dataset.rodId;
                const rod = this.rods.find(r => r.id == rodId);
                if (!rod) return;

                const now = Date.now();
                const timeSinceLastClick = now - lastTime;

                console.log('[Click] Клик на:', rod.name, 'время с последнего:', timeSinceLastClick, 'ms');

                if (timeSinceLastClick < 300) {
                    // Это двойной клик!
                    console.log('[DoubleClick] ДВОЙНОЙ ТАП! Экипируем:', rod.name);
                    
                    // Отменяем таймер первого клика чтобы не открывалось bottom sheet
                    if (singleClickTimeout) {
                        clearTimeout(singleClickTimeout);
                        singleClickTimeout = null;
                    }
                    
                    wasDoubleTap = true;
                    this.onRodDoubleTap?.(rod, e);
                    lastTime = 0; // Сбрасываем счетчик
                } else {
                    // Это первый/одиночный клик
                    console.log('[SingleClick] Одиночный тап, ждем еще 300ms для double-tap');
                    lastTime = now;
                    wasDoubleTap = false;
                    
                    // Отменяем старый таймер если был
                    if (singleClickTimeout) {
                        clearTimeout(singleClickTimeout);
                    }
                    
                    // Открываем bottom sheet только если это точно одиночный клик
                    singleClickTimeout = setTimeout(() => {
                        if (!wasDoubleTap) {
                            console.log('[SingleClick] Прошло 300ms, это точно одиночный клик');
                            this.onSlotSelected?.(rod, e);
                        } else {
                            console.log('[SingleClick] Был двойной клик, пропускаем onSlotSelected');
                        }
                        singleClickTimeout = null;
                    }, 300);
                }
            });

            // ===== HOVER Events (Desktop только) =====
            slot.addEventListener('mouseenter', (e) => {
                if (!slot.classList.contains('empty')) {
                    const rodId = slot.dataset.rodId;
                    const rod = this.rods.find(r => r.id == rodId);
                    if (rod) {
                        this.onSlotHover?.(rod, e);
                    }
                }
            });
            
            slot.addEventListener('mouseleave', () => {
                this.onSlotLeave?.();
            });

            // ===== CONTEXT MENU Event (Desktop) =====
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!slot.classList.contains('empty')) {
                    const rodId = slot.dataset.rodId;
                    const rod = this.rods.find(r => r.id == rodId);
                    if (rod) {
                        this.onSlotContextMenu?.(rod, e);
                    }
                }
            });

            // ===== TOUCH Events (Mobile долгое нажатие) =====
            slot.addEventListener('touchstart', (e) => {
                if (slot.classList.contains('empty')) return;
                
                console.log('[TouchStart] Начало касания на слоте:', slot.dataset.rodId);
                
                // Инициализируем трекер для этого касания
                this.touchTracker[slotId] = {
                    startTime: Date.now(),
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    moved: false,
                    wasLongPress: false,
                    timeout: null
                };

                // Устанавливаем вибрацию при долгом нажатии (если доступна)
                this.touchTracker[slotId].timeout = setTimeout(() => {
                    if (!this.touchTracker[slotId].moved) {
                        // Долгое нажатие обнаружено!
                        console.log('[LongPress] Обнаружено долгое нажатие на:', slotId);
                        
                        if (navigator.vibrate) {
                            navigator.vibrate(50); // Вибрируем на 50ms
                            console.log('[Vibrate] Вибрация активирована');
                        }
                        
                        this.touchTracker[slotId].wasLongPress = true;
                        
                        // Показываем контекстное меню
                        const rodId = slot.dataset.rodId;
                        const rod = this.rods.find(r => r.id == rodId);
                        if (rod) {
                            console.log('[ContextMenu] Показываем меню для:', rod.name);
                            // Создаём синтетическое событие для совместимости
                            const syntheticEvent = {
                                target: slot,
                                preventDefault: () => {},
                                stopPropagation: () => {}
                            };
                            this.onSlotContextMenu?.(rod, syntheticEvent);
                        }
                    }
                }, 500); // 500ms = долгое нажатие
            });

            // Отслеживаем движение пальца (если пользователь двигает - отменяем долгое нажатие)
            slot.addEventListener('touchmove', (e) => {
                if (!this.touchTracker[slotId]) return;
                
                const deltaX = Math.abs(e.touches[0].clientX - this.touchTracker[slotId].startX);
                const deltaY = Math.abs(e.touches[0].clientY - this.touchTracker[slotId].startY);
                
                // Если палец переместился больше чем на 10px - это scroll/drag, не долгое нажатие
                if (deltaX > 10 || deltaY > 10) {
                    this.touchTracker[slotId].moved = true;
                    clearTimeout(this.touchTracker[slotId].timeout);
                    console.log('[TouchMove] Движение пальца - отмена долгого нажатия');
                }
            });

            // Завершение касания
            slot.addEventListener('touchend', (e) => {
                if (this.touchTracker[slotId]) {
                    clearTimeout(this.touchTracker[slotId].timeout);
                    
                    // Если это был быстрый тап (не долгое нажатие) и палец не двигался - это обычный клик
                    const duration = Date.now() - this.touchTracker[slotId].startTime;
                    console.log('[TouchEnd] Касание завершено, продолжительность:', duration, 'ms');
                    
                    if (duration < 500 && !this.touchTracker[slotId].moved && !slot.classList.contains('empty')) {
                        console.log('[QuickTap] Быстрое касание - выбираем слот');
                        const rodId = slot.dataset.rodId;
                        const rod = this.rods.find(r => r.id == rodId);
                        if (rod) {
                            this.onSlotSelected?.(rod, e);
                        }
                    }
                    
                    delete this.touchTracker[slotId];
                }
            });

            // Отмена касания (палец вышел за границы элемента)
            slot.addEventListener('touchcancel', (e) => {
                if (this.touchTracker[slotId]) {
                    clearTimeout(this.touchTracker[slotId].timeout);
                    console.log('[TouchCancel] Касание отменено');
                    delete this.touchTracker[slotId];
                }
            });
        });
    },

    getSlotByIndex(index) {
        return this.rods[index] || null;
    }
};
