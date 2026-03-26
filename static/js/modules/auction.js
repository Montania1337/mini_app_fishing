/**
 * Auction Module - grid rendering and interactions for marketplace lots.
 */

const AuctionManager = {
    ui: {},
    selectedRod: null,
    listings: [],
    myListings: [],
    currentBottomSheet: null,
    propOrder: ['reward', 'xp', 'luck', 'speed', 'power', 'piercing', 'crit'],

    init(uiElements) {
        this.ui = {
            modal: uiElements.auctionModal,
            selectedRod: uiElements.auctionSelectedRod,
            priceInput: uiElements.auctionPriceInput,
            listings: uiElements.auctionListings,
            myListings: uiElements.auctionMyListings,
            tooltip: uiElements.tooltip,
            contextMenu: uiElements.contextMenu,
            bottomSheet: uiElements.auctionBottomSheet,
            bottomSheetTitle: uiElements.auctionBottomSheetTitle,
            bottomSheetMeta: uiElements.auctionBottomSheetMeta,
            bottomSheetStats: uiElements.auctionBottomSheetStats,
            bottomSheetAction: uiElements.auctionBottomSheetAction
        };

        if (this.ui.priceInput) {
            this.ui.priceInput.addEventListener('input', () => {
                this.renderSelectedRod();
            });
        }
    },

    open(selectedRod = null) {
        if (selectedRod) {
            this.setSelectedRod(selectedRod);
        } else {
            this.renderSelectedRod();
        }

        this.hideOverlays();
        UIManager.showModal(this.ui.modal);
        this.load();
    },

    close() {
        this.hideOverlays();
        UIManager.hideModal(this.ui.modal);
    },

    hideOverlays() {
        this.hideTooltip();
        this.hideContextMenu();
        this.hideBottomSheet();
    },

    setSelectedRod(rod) {
        this.selectedRod = rod;
        this.renderSelectedRod();
    },

    renderSelectedRod() {
        if (!this.ui.selectedRod) return;

        if (!this.selectedRod) {
            this.ui.selectedRod.innerHTML = `
                <div class="auction-empty-state centered">
                    Выберите удочку в инвентаре и нажмите "На аукцион".
                </div>
            `;
            return;
        }

        const previewRod = {
            ...this.selectedRod,
            seller_name: 'Выбрано',
            price: this.ui.priceInput?.value ? Number(this.ui.priceInput.value) : null
        };

        this.ui.selectedRod.innerHTML = this.buildSlotHTML(previewRod, {
            selected: true,
            sellerLabel: 'Готово к продаже',
            priceLabel: previewRod.price ? `${this.formatNumber(previewRod.price)} 💰` : 'Цена'
        });
    },

    async load() {
        try {
            const data = await API.getAuctionListings();
            this.listings = data.listings || [];
            this.myListings = data.my_listings || [];
            this.renderListings(this.listings);
            this.renderMyListings(this.myListings);
        } catch (e) {
            Log.error(`Ошибка загрузки аукциона: ${e.message}`);
        }
    },

    renderListings(listings) {
        this.renderGrid(this.ui.listings, listings, {
            emptyMessage: 'Сейчас на аукционе нет лотов.',
            source: 'market'
        });
    },

    renderMyListings(listings) {
        this.renderGrid(this.ui.myListings, listings, {
            emptyMessage: 'У вас пока нет активных лотов.',
            source: 'mine'
        });
    },

    renderGrid(container, listings, options = {}) {
        if (!container) return;

        const { emptyMessage = '', source = 'market' } = options;

        if (!listings.length) {
            container.innerHTML = `<div class="auction-empty-state centered">${emptyMessage}</div>`;
            return;
        }

        const totalSlots = Math.max(21, listings.length);
        let html = '';

        for (let i = 0; i < totalSlots; i++) {
            const listing = listings[i];

            if (listing) {
                html += this.buildSlotHTML(listing, {
                    myLot: this.isMyListing(listing),
                    sellerLabel: this.getSellerLabel(listing, source),
                    priceLabel: `${this.formatNumber(listing.price)} 💰`
                });
            } else {
                html += '<div class="inventory-slot auction-slot empty"></div>';
            }
        }

        container.innerHTML = html;
        this.setupGridListeners(container, listings, source);
    },

    setupGridListeners(container, listings, source) {
        const slots = container.querySelectorAll('.auction-slot[data-listing-id]');

        slots.forEach((slot) => {
            const listingId = Number(slot.dataset.listingId);
            const listing = listings.find((item) => Number(item.id) === listingId);

            if (!listing) return;

            slot.addEventListener('click', (event) => {
                event.stopPropagation();

                if (this.shouldUseBottomSheet()) {
                    this.showBottomSheet(listing, source);
                }
            });

            slot.addEventListener('mouseenter', (event) => {
                if (!this.shouldUseBottomSheet()) {
                    this.showTooltip(listing, event.currentTarget);
                }
            });

            slot.addEventListener('mouseleave', () => {
                if (!this.shouldUseBottomSheet()) {
                    this.hideTooltip();
                }
            });

            slot.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (this.shouldUseBottomSheet()) {
                    this.showBottomSheet(listing, source);
                } else {
                    this.showContextMenu(listing, event, source);
                }
            });
        });
    },

    buildSlotHTML(listing, options = {}) {
        const {
            myLot = false,
            selected = false,
            sellerLabel = '',
            priceLabel = ''
        } = options;

        const rod = listing;
        const durability = Number(rod.durability ?? 0);
        const gearScore = Number(rod.gear_score ?? 0);
        const durabilityClass = this.getDurabilityClass(durability);
        const durabilityValue = this.getDurabilityLabel(durability);
        const classes = [
            'inventory-slot',
            'auction-slot',
            myLot ? 'my-lot' : '',
            selected ? 'selected-lot' : '',
            myLot && !selected ? 'is-owned' : ''
        ].filter(Boolean).join(' ');

        const listingIdAttr = listing.id ? `data-listing-id="${this.escapeAttribute(String(listing.id))}"` : '';
        const priceMarkup = priceLabel
            ? `<div class="item-price">${this.escapeHtml(priceLabel)}</div>`
            : '';

        return `
            <div class="${classes}" ${listingIdAttr}>
                ${priceMarkup}
                <div class="item-icon">${this.escapeHtml(rod.emoji || '🎣')}</div>
                <div class="item-name">${this.escapeHtml(rod.name || 'Удочка')}</div>
                <div class="item-durability durability-${durabilityClass}">${this.escapeHtml(durabilityValue)}</div>
                <div class="item-gear-score">⚙️ ${this.escapeHtml(String(gearScore))}</div>
            </div>
        `;
    },

    shouldUseBottomSheet() {
        return typeof SettingsManager !== 'undefined' && SettingsManager.getSetting('actionMenuOnTap');
    },

    showTooltip(listing, targetElement) {
        if (!this.ui.tooltip || !targetElement) return;

        this.hideContextMenu();
        this.hideBottomSheet();

        const damageLabel = this.getDamageLabel(listing);
        const rarityLabel = listing.rarity || 'common';
        const upgradeLevel = Number(listing.upgrade_level || 0);
        const propertiesHtml = this.buildPropertyStatsHTML(listing);

        this.ui.tooltip.innerHTML = `
            <div class="tooltip-header">
                <h3 class="tooltip-name rarity-${this.escapeAttribute(rarityLabel)}">${this.escapeHtml(listing.name || 'Удочка')}</h3>
                <div class="tooltip-damage" style="margin-top: 8px; color: #ff6b6b; font-weight: 600; font-size: 0.95em;">
                    💥 Урон: ${this.escapeHtml(damageLabel)}
                </div>
                <div style="margin-top: 6px; font-size: 0.9em; color: #ffd700;">
                    💰 Цена: ${this.escapeHtml(this.formatNumber(listing.price))} | 👤 ${this.escapeHtml(this.getSellerLabel(listing, 'market'))}
                </div>
                <div style="margin-top: 6px; font-size: 0.85em; color: rgba(255,255,255,0.65);">
                    Редкость: ${this.escapeHtml(String(rarityLabel))} | Улучшение: +${this.escapeHtml(String(upgradeLevel))}
                </div>
            </div>
            <div class="tooltip-stats rarity-${this.escapeAttribute(rarityLabel)}">
                <div class="tooltip-stat-header">Характеристики</div>
                ${propertiesHtml}
            </div>
        `;

        this.ui.tooltip.classList.remove('hidden');
        TooltipManager.currentTooltip = this.ui.tooltip;
        TooltipManager.positionTooltip(this.ui.tooltip, { target: targetElement });
    },

    hideTooltip() {
        if (TooltipManager.currentTooltip === this.ui.tooltip) {
            TooltipManager.hide();
            return;
        }

        if (this.ui.tooltip) {
            this.ui.tooltip.classList.add('hidden');
        }
    },

    showContextMenu(listing, event, source) {
        if (!this.ui.contextMenu) return;

        this.hideTooltip();
        this.hideBottomSheet();

        const action = this.isMyListing(listing) || source === 'mine'
            ? { id: 'cancel', label: 'Снять с аукциона', danger: true }
            : { id: 'buy', label: 'Купить лот', danger: false };

        this.ui.contextMenu.innerHTML = `
            <div class="context-menu-item ${action.danger ? 'danger' : ''}" data-auction-action="${action.id}">
                ${this.escapeHtml(action.label)}
            </div>
        `;

        this.ui.contextMenu.classList.remove('hidden');
        TooltipManager.currentContextMenu = { element: this.ui.contextMenu, rod: listing };

        const menuRect = this.ui.contextMenu.getBoundingClientRect();
        let left = event.clientX + 10;
        let top = event.clientY + 10;

        if (left + menuRect.width > window.innerWidth - 10) {
            left = event.clientX - menuRect.width - 10;
        }

        if (top + menuRect.height > window.innerHeight - 10) {
            top = event.clientY - menuRect.height - 10;
        }

        this.ui.contextMenu.style.left = `${Math.max(10, left)}px`;
        this.ui.contextMenu.style.top = `${Math.max(10, top)}px`;

        const item = this.ui.contextMenu.querySelector('[data-auction-action]');
        if (item) {
            item.addEventListener('click', async (clickEvent) => {
                clickEvent.stopPropagation();
                this.hideContextMenu();
                await this.handleAction(action.id, listing);
            });
        }
    },

    hideContextMenu() {
        if (TooltipManager.currentContextMenu?.element === this.ui.contextMenu) {
            TooltipManager.hideContextMenu();
            return;
        }

        if (this.ui.contextMenu) {
            this.ui.contextMenu.classList.add('hidden');
        }
    },

    showBottomSheet(listing, source) {
        if (!this.ui.bottomSheet) return;

        this.hideTooltip();
        this.hideContextMenu();

        const action = this.isMyListing(listing) || source === 'mine'
            ? { id: 'cancel', label: 'Снять лот', danger: true }
            : { id: 'buy', label: 'Купить', danger: false };

        if (this.ui.bottomSheetTitle) {
            this.ui.bottomSheetTitle.textContent = listing.name || 'Лот';
        }

        if (this.ui.bottomSheetMeta) {
            this.ui.bottomSheetMeta.innerHTML = `
                <div class="auction-meta-pill">
                    <span>Продавец</span>
                    <strong>${this.escapeHtml(this.getSellerLabel(listing, 'market'))}</strong>
                </div>
                <div class="auction-meta-pill">
                    <span>Цена</span>
                    <strong>${this.escapeHtml(this.formatNumber(listing.price))} 💰</strong>
                </div>
            `;
        }

        if (this.ui.bottomSheetStats) {
            this.ui.bottomSheetStats.innerHTML = this.buildBottomSheetStatsHTML(listing);
        }

        if (this.ui.bottomSheetAction) {
            const actionButton = this.ui.bottomSheetAction.cloneNode(true);
            actionButton.id = this.ui.bottomSheetAction.id;
            actionButton.textContent = action.label;
            actionButton.className = action.danger ? 'action-btn danger' : 'action-btn';
            this.ui.bottomSheetAction.parentNode.replaceChild(actionButton, this.ui.bottomSheetAction);
            this.ui.bottomSheetAction = actionButton;
            this.ui.bottomSheetAction.addEventListener('click', async (event) => {
                event.stopPropagation();
                this.hideBottomSheet();
                await this.handleAction(action.id, listing);
            });
        }

        this.ui.bottomSheet.classList.remove('hidden');
        this.currentBottomSheet = { element: this.ui.bottomSheet, listing };
        this.bindBottomSheetSwipe();
    },

    bindBottomSheetSwipe() {
        if (!this.ui.bottomSheet) return;

        let touchStartY = 0;
        const swipeHandler = (event) => {
            if (event.type === 'touchstart') {
                touchStartY = event.touches[0].clientY;
                return;
            }

            const touchEndY = event.changedTouches[0].clientY;
            if (touchEndY - touchStartY > 50) {
                this.hideBottomSheet();
            }
        };

        if (this._auctionSwipeStartHandler) {
            this.ui.bottomSheet.removeEventListener('touchstart', this._auctionSwipeStartHandler);
        }

        if (this._auctionSwipeEndHandler) {
            this.ui.bottomSheet.removeEventListener('touchend', this._auctionSwipeEndHandler);
        }

        this._auctionSwipeStartHandler = (event) => swipeHandler(event);
        this._auctionSwipeEndHandler = (event) => swipeHandler(event);

        this.ui.bottomSheet.addEventListener('touchstart', this._auctionSwipeStartHandler);
        this.ui.bottomSheet.addEventListener('touchend', this._auctionSwipeEndHandler);
    },

    hideBottomSheet() {
        if (this.currentBottomSheet) {
            this.currentBottomSheet.element.classList.add('hidden');
            this.currentBottomSheet = null;
            return;
        }

        if (this.ui.bottomSheet) {
            this.ui.bottomSheet.classList.add('hidden');
        }
    },

    buildBottomSheetStatsHTML(listing) {
        const damageLabel = this.getDamageLabel(listing);
        const durabilityLabel = this.getDurabilityLabel(Number(listing.durability ?? 0));
        const rarityLabel = listing.rarity || 'common';
        const upgradeLevel = Number(listing.upgrade_level || 0);

        const items = [
            `
                <div class="bottom-sheet-stat-item">
                    <div class="bottom-sheet-stat-title">
                        <span>Урон</span>
                        <span class="bottom-sheet-stat-value">${this.escapeHtml(damageLabel)}</span>
                    </div>
                    <div class="bottom-sheet-stat-tier">Редкость: ${this.escapeHtml(String(rarityLabel))}</div>
                </div>
            `,
            `
                <div class="bottom-sheet-stat-item">
                    <div class="bottom-sheet-stat-title">
                        <span>Прочность</span>
                        <span class="bottom-sheet-stat-value">${this.escapeHtml(durabilityLabel)}</span>
                    </div>
                    <div class="bottom-sheet-stat-tier">Улучшение: +${this.escapeHtml(String(upgradeLevel))}</div>
                </div>
            `
        ];

        return items.concat(this.buildPropertyStatsBlocks(listing)).join('');
    },

    buildPropertyStatsHTML(listing) {
        const properties = this.parseProperties(listing);
        const blocks = [];

        for (const propName of this.propOrder) {
            if (!(propName in properties)) continue;

            const tier = Number(properties[propName]);
            const tierDesc = tier <= 3 ? 'низкий' : (tier <= 6 ? 'средний' : 'высокий');
            const value = typeof RodManager !== 'undefined' && RodManager.formatPropertyValue
                ? RodManager.formatPropertyValue(propName, tier)
                : tier;
            const name = window.ROD_PROPERTY_NAMES?.[propName] || propName;
            const desc = window.ROD_PROPERTY_DESCRIPTIONS?.[propName] || '';

            blocks.push(`
                <div class="tooltip-stat-item">
                    <div class="tooltip-stat-title">
                        <span>${this.escapeHtml(name)}</span>
                        <span class="tooltip-stat-value">${this.escapeHtml(String(value))}</span>
                    </div>
                    <div class="tooltip-stat-tier">Уровень ${this.escapeHtml(String(tier))}/10 (${this.escapeHtml(tierDesc)})</div>
                    <div class="tooltip-stat-desc">${this.escapeHtml(desc)}</div>
                </div>
            `);
        }

        if (!blocks.length) {
            return `
                <div class="tooltip-stat-item">
                    <div class="tooltip-stat-title">
                        <span>Доп. свойства</span>
                        <span class="tooltip-stat-value">Нет</span>
                    </div>
                </div>
            `;
        }

        return blocks.join('');
    },

    buildPropertyStatsBlocks(listing) {
        const properties = this.parseProperties(listing);
        const blocks = [];

        for (const propName of this.propOrder) {
            if (!(propName in properties)) continue;

            const tier = Number(properties[propName]);
            const tierDesc = tier <= 3 ? 'низкий' : (tier <= 6 ? 'средний' : 'высокий');
            const value = typeof RodManager !== 'undefined' && RodManager.formatPropertyValue
                ? RodManager.formatPropertyValue(propName, tier)
                : tier;
            const name = window.ROD_PROPERTY_NAMES?.[propName] || propName;
            const desc = window.ROD_PROPERTY_DESCRIPTIONS?.[propName] || '';

            blocks.push(`
                <div class="bottom-sheet-stat-item">
                    <div class="bottom-sheet-stat-title">
                        <span>${this.escapeHtml(name)}</span>
                        <span class="bottom-sheet-stat-value">${this.escapeHtml(String(value))}</span>
                    </div>
                    <div class="bottom-sheet-stat-tier">Уровень ${this.escapeHtml(String(tier))}/10 (${this.escapeHtml(tierDesc)})</div>
                    <div class="bottom-sheet-stat-desc">${this.escapeHtml(desc)}</div>
                </div>
            `);
        }

        return blocks;
    },

    parseProperties(rod) {
        if (!rod?.properties) return {};

        if (typeof rod.properties === 'string') {
            try {
                return JSON.parse(rod.properties);
            } catch (error) {
                return {};
            }
        }

        return rod.properties;
    },

    isMyListing(listing) {
        return Number(listing?.seller_id) === Number(window.user?.id);
    },

    getSellerLabel(listing, source = 'market') {
        if (source === 'mine' || this.isMyListing(listing)) {
            return 'Вы';
        }

        return listing.seller_name || 'Игрок';
    },

    getDurabilityClass(durability) {
        if (durability === -1) return 'infinite';
        if (durability <= 10) return 'low';
        if (durability <= 50) return 'medium';
        return 'high';
    },

    getDurabilityLabel(durability) {
        return durability === -1 ? '♾️' : String(durability);
    },

    getDamageLabel(rod) {
        if (typeof RodManager !== 'undefined' && RodManager.calculateEffectiveDamage) {
            const damage = RodManager.calculateEffectiveDamage(rod);
            return `${damage.effective.min}-${damage.effective.max}`;
        }

        const minDamage = Number(rod.min_damage ?? rod.damage_min ?? 0);
        const maxDamage = Number(rod.max_damage ?? rod.damage_max ?? 0);
        return `${minDamage}-${maxDamage}`;
    },

    formatNumber(value) {
        return Number(value || 0).toLocaleString('ru-RU');
    },

    async submitSelectedRod() {
        const price = Number(this.ui.priceInput?.value || 0);

        if (!this.selectedRod) {
            Log.warning('Сначала выберите удочку в инвентаре.');
            return;
        }

        if (!Number.isFinite(price) || price <= 0) {
            Log.warning('Введите корректную цену для аукциона.');
            return;
        }

        try {
            await API.sellRodAtAuction(this.selectedRod.id, price);
            Log.success(`Удочка "${this.selectedRod.name}" выставлена за ${price} 💰`);
            this.selectedRod = null;
            if (this.ui.priceInput) {
                this.ui.priceInput.value = '';
            }
            this.renderSelectedRod();
            await this.load();
            if (typeof refreshInventory === 'function') {
                await refreshInventory();
            }
        } catch (e) {
            Log.error(`Ошибка выставления на аукцион: ${e.message}`);
        }
    },

    async handleAction(action, listing) {
        if (action === 'buy') {
            await this.buy(listing.id);
            return;
        }

        if (action === 'cancel') {
            await this.cancel(listing.id);
        }
    },

    async buy(listingId) {
        try {
            const result = await API.buyAuctionListing(Number(listingId));
            UIManager.updateBalance(result.balance);
            Log.success(`Куплена удочка "${result.rod_name}" у игрока ${result.seller_name}`);
            await this.load();
            if (typeof refreshInventory === 'function') {
                await refreshInventory();
            }
        } catch (e) {
            Log.error(`Ошибка покупки на аукционе: ${e.message}`);
        }
    },

    async cancel(listingId) {
        try {
            await API.cancelAuctionListing(Number(listingId));
            Log.info('Лот снят с аукциона.');
            await this.load();
            if (typeof refreshInventory === 'function') {
                await refreshInventory();
            }
        } catch (e) {
            Log.error(`Ошибка снятия лота: ${e.message}`);
        }
    },

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/`/g, '&#96;');
    }
};
