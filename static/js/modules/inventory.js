/**
 * Inventory Module - управление инвентарем и сеткой удочек.
 */

const InventoryManager = {
    rods: [],
    draggedRod: null,
    touchTracker: {},

    renderInventoryGrid(rods, invGridElement) {
        if (!invGridElement) return;

        this.rods = rods;
        const maxSlots = 21;
        let html = '';

        for (let i = 0; i < maxSlots; i++) {
            const rod = rods[i];

            if (rod) {
                html += RodManager.buildSlotHTML(rod, {
                    index: i,
                    active: rod.is_active
                });
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
            let lastTime = 0;
            let singleClickTimeout = null;
            let wasDoubleTap = false;

            slot.addEventListener('click', (e) => {
                e.stopPropagation();

                if (this.touchTracker[slotId]?.wasLongPress) {
                    this.touchTracker[slotId].wasLongPress = false;
                    return;
                }

                if (slot.classList.contains('empty')) return;

                const rodId = slot.dataset.rodId;
                const rod = this.rods.find((item) => item.id == rodId);
                if (!rod) return;

                const now = Date.now();
                const timeSinceLastClick = now - lastTime;

                console.log('[Click] Клик на:', rod.name, 'время с последнего:', timeSinceLastClick, 'ms');

                if (timeSinceLastClick < 300) {
                    console.log('[DoubleClick] ДВОЙНОЙ ТАП! Экипируем:', rod.name);

                    if (singleClickTimeout) {
                        clearTimeout(singleClickTimeout);
                        singleClickTimeout = null;
                    }

                    wasDoubleTap = true;
                    this.onRodDoubleTap?.(rod, e);
                    lastTime = 0;
                } else {
                    console.log('[SingleClick] Одиночный тап, ждём ещё 300ms для double-tap');
                    lastTime = now;
                    wasDoubleTap = false;

                    if (singleClickTimeout) {
                        clearTimeout(singleClickTimeout);
                    }

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

            slot.addEventListener('mouseenter', (e) => {
                if (slot.classList.contains('empty')) return;

                const rodId = slot.dataset.rodId;
                const rod = this.rods.find((item) => item.id == rodId);
                if (rod) {
                    this.onSlotHover?.(rod, e);
                }
            });

            slot.addEventListener('mouseleave', () => {
                this.onSlotLeave?.();
            });

            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (slot.classList.contains('empty')) return;

                const rodId = slot.dataset.rodId;
                const rod = this.rods.find((item) => item.id == rodId);
                if (rod) {
                    this.onSlotContextMenu?.(rod, e);
                }
            });

            slot.addEventListener('touchstart', (e) => {
                if (slot.classList.contains('empty')) return;

                console.log('[TouchStart] Начало касания на слоте:', slot.dataset.rodId);

                this.touchTracker[slotId] = {
                    startTime: Date.now(),
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    moved: false,
                    wasLongPress: false,
                    timeout: null
                };

                this.touchTracker[slotId].timeout = setTimeout(() => {
                    if (this.touchTracker[slotId] && !this.touchTracker[slotId].moved) {
                        console.log('[LongPress] Обнаружено долгое нажатие на:', slotId);

                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                            console.log('[Vibrate] Вибрация активирована');
                        }

                        this.touchTracker[slotId].wasLongPress = true;

                        const rodId = slot.dataset.rodId;
                        const rod = this.rods.find((item) => item.id == rodId);
                        if (rod) {
                            console.log('[ContextMenu] Показываем меню для:', rod.name);
                            const syntheticEvent = {
                                target: slot,
                                currentTarget: slot,
                                preventDefault: () => {},
                                stopPropagation: () => {}
                            };
                            this.onSlotContextMenu?.(rod, syntheticEvent);
                        }
                    }
                }, 500);
            });

            slot.addEventListener('touchmove', (e) => {
                if (!this.touchTracker[slotId]) return;

                const deltaX = Math.abs(e.touches[0].clientX - this.touchTracker[slotId].startX);
                const deltaY = Math.abs(e.touches[0].clientY - this.touchTracker[slotId].startY);

                if (deltaX > 10 || deltaY > 10) {
                    this.touchTracker[slotId].moved = true;
                    clearTimeout(this.touchTracker[slotId].timeout);
                    console.log('[TouchMove] Движение пальца - отмена долгого нажатия');
                }
            });

            slot.addEventListener('touchend', (e) => {
                if (!this.touchTracker[slotId]) return;

                clearTimeout(this.touchTracker[slotId].timeout);
                const duration = Date.now() - this.touchTracker[slotId].startTime;
                console.log('[TouchEnd] Касание завершено, продолжительность:', duration, 'ms');

                if (duration < 500 && !this.touchTracker[slotId].moved && !slot.classList.contains('empty')) {
                    console.log('[QuickTap] Быстрое касание - выбираем слот');
                    const rodId = slot.dataset.rodId;
                    const rod = this.rods.find((item) => item.id == rodId);
                    if (rod) {
                        this.onSlotSelected?.(rod, e);
                    }
                }

                delete this.touchTracker[slotId];
            });

            slot.addEventListener('touchcancel', () => {
                if (!this.touchTracker[slotId]) return;

                clearTimeout(this.touchTracker[slotId].timeout);
                console.log('[TouchCancel] Касание отменено');
                delete this.touchTracker[slotId];
            });
        });
    },

    getSlotByIndex(index) {
        return this.rods[index] || null;
    }
};
