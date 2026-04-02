/**
 * Auction Module - grid rendering and interactions for marketplace lots.
 */

// import {propOrder} from './constants.js'

const AuctionManager = {
    ui: {},
    selectedRod: null,
    listings: [],
    myListings: [],
    currentBottomSheet: null,
    countdownTimerId: null,
    isReloadingExpiredListings: false,

    init(uiElements) {
        this.ui = {
            modal: uiElements.auctionModal,
            sellModal: uiElements.auctionSellModal,
            selectedRod: uiElements.auctionSelectedRod,
            priceInput: uiElements.auctionPriceInput,
            pricePreview: uiElements.auctionPricePreview,
            feeAmount: uiElements.auctionFeeAmount,
            feeNote: uiElements.auctionFeeNote,
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
                this.updateSellSummary();
            });
        }

        this.startCountdownTicker();

        if (this.ui.sellModal) {
            this.ui.sellModal.addEventListener('click', (event) => {
                if (event.target === this.ui.sellModal) {
                    this.closeSellModal();
                }
            });
        }
    },

    open() {
        this.hideOverlays();
        UIManager.showModal(this.ui.modal);
        this.load();
    },

    close() {
        this.hideOverlays();
        UIManager.hideModal(this.ui.modal);
    },

    openSellModal(rod) {
        if (!rod || !this.ui.sellModal) return;

        this.hideOverlays();
        this.selectedRod = rod;

        if (this.ui.priceInput) {
            this.ui.priceInput.value = '';
        }

        this.renderSelectedRod();
        this.updateSellSummary();
        UIManager.showModal(this.ui.sellModal);
        this.ui.priceInput?.focus();
    },

    closeSellModal() {
        if (this.ui.sellModal) {
            UIManager.hideModal(this.ui.sellModal);
        }

        this.selectedRod = null;

        if (this.ui.priceInput) {
            this.ui.priceInput.value = '';
        }

        this.renderSelectedRod();
        this.updateSellSummary();
    },

    hideOverlays() {
        this.hideTooltip();
        this.hideContextMenu();
        this.hideBottomSheet();
    },

    setSelectedRod(rod) {
        this.selectedRod = rod;
        this.renderSelectedRod();
        this.updateSellSummary();
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

    getFeeRate() {
        return Number(window.AUCTION_LISTING_FEE_PERCENT ?? 0.01);
    },

    getMinFee() {
        return Number(window.AUCTION_LISTING_MIN_FEE ?? 1);
    },

    getListingDurationHours() {
        return Number(window.AUCTION_LISTING_DURATION_HOURS ?? 72);
    },

    calculateListingFee(price) {
        if (!Number.isFinite(price) || price <= 0) {
            return 0;
        }

        return Math.max(this.getMinFee(), Math.ceil(price * this.getFeeRate()));
    },

    formatFeeRate() {
        const percent = this.getFeeRate() * 100;
        return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;
    },

    updateSellSummary() {
        const price = Number(this.ui.priceInput?.value || 0);
        const fee = this.calculateListingFee(price);

        if (this.ui.pricePreview) {
            this.ui.pricePreview.textContent = price > 0
                ? `${this.formatNumber(price)} 💰`
                : '—';
        }

        if (this.ui.feeAmount) {
            this.ui.feeAmount.textContent = fee > 0
                ? `${this.formatNumber(fee)} 💰`
                : '—';
        }

        if (this.ui.feeNote) {
            this.ui.feeNote.textContent = `Лот будет активен ${this.getListingDurationHours()} ч. Комиссия ${this.formatFeeRate()} списывается сразу. Минимум: ${this.formatNumber(this.getMinFee())} 💰.`;
        }
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
                    expiresAtTs: listing.expires_at_ts,
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
            priceLabel = '',
            timeLabel = '',
            expiresAtTs = null
        } = options;

        return RodManager.buildSlotHTML(listing, {
            slotType: 'auction',
            myLot,
            selected,
            sellerLabel,
            priceLabel,
            timeLabel,
            expiresAtTs,
            listingId: listing.id
        });
    },

    shouldUseBottomSheet() {
        return typeof SettingsManager !== 'undefined' && SettingsManager.getSetting('actionMenuOnTap');
    },

    showTooltip(listing, targetElement) {
        if (!this.ui.tooltip || !targetElement) return;

        this.hideContextMenu();
        this.hideBottomSheet();

        this.ui.tooltip.innerHTML = RodManager.buildTooltipHTML(listing, {
            extraMetaHTML: `
                <div style="margin-top: 6px; font-size: 0.9em; color: #ffd700;">
                    💰 Цена: ${this.escapeHtml(this.formatNumber(listing.price))} | 👤 ${this.escapeHtml(this.getSellerLabel(listing, 'market'))}
                </div>
                <div style="margin-top: 4px; font-size: 0.85em; color: rgba(255,255,255,0.72);">
                    ⏳ Осталось: ${this.escapeHtml(this.formatRemainingTime(listing))}
                </div>
            `
        });

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

        const sellerLabel = this.getSellerLabel(listing, source);
        const action = this.isMyListing(listing) || source === 'mine'
            ? { id: 'cancel', label: 'Снять лот', danger: true }
            : { id: 'buy', label: 'Купить', danger: false };

        const result = BottomSheetManager.show({
            element: this.ui.bottomSheet,
            titleElement: this.ui.bottomSheetTitle,
            title: listing.name || 'Лот',
            metaElement: this.ui.bottomSheetMeta,
            metaHTML: `
                <div class="bottom-sheet-meta-pill">
                    <span>Продавец</span>
                    <strong>${this.escapeHtml(sellerLabel)}</strong>
                </div>
                <div class="bottom-sheet-meta-pill">
                    <span>Цена</span>
                    <strong>${this.escapeHtml(this.formatNumber(listing.price))} 💰</strong>
                </div>
                <div class="bottom-sheet-meta-pill">
                    <span>Осталось</span>
                    <strong>${this.escapeHtml(this.formatRemainingTime(listing))}</strong>
                </div>
            `,
            statsElement: this.ui.bottomSheetStats,
            statsHTML: RodManager.buildBottomSheetStatsHTML(listing),
            actions: [
                {
                    element: this.ui.bottomSheetAction,
                    id: action.id,
                    label: action.label,
                    danger: action.danger
                }
            ],
            onAction: async (actionId, event) => {
                event.stopPropagation();
                this.hideBottomSheet();
                await this.handleAction(actionId, listing);
            },
            onClose: () => this.hideBottomSheet()
        });

        if (result.actionElements[0]) {
            this.ui.bottomSheetAction = result.actionElements[0];
        }

        this.currentBottomSheet = { element: this.ui.bottomSheet, listing };
    },

    hideBottomSheet() {
        if (this.currentBottomSheet) {
            BottomSheetManager.hide(this.currentBottomSheet.element);
            this.currentBottomSheet = null;
            return;
        }

        if (this.ui.bottomSheet) {
            BottomSheetManager.hide(this.ui.bottomSheet);
        }
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

    getDurabilityLabel(durability) {
        return RodManager.getDurabilityLabel(durability);
    },

    getDamageLabel(rod) {
        return RodManager.getDamageLabel(rod);
    },

    formatNumber(value) {
        return Number(value || 0).toLocaleString('ru-RU');
    },

    getRemainingSeconds(listing) {
        const expiresAtTs = Number(listing?.expires_at_ts || 0);
        if (!expiresAtTs) {
            return 0;
        }

        return Math.max(0, expiresAtTs - Math.floor(Date.now() / 1000));
    },

    formatRemainingTime(listing) {
        const totalSeconds = this.getRemainingSeconds(listing);

        if (totalSeconds <= 0) {
            return 'Истекло';
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}ч ${String(minutes).padStart(2, '0')}м`;
        }

        return `${minutes}м ${String(seconds).padStart(2, '0')}с`;
    },

    startCountdownTicker() {
        if (this.countdownTimerId) {
            return;
        }

        this.countdownTimerId = window.setInterval(() => {
            this.updateCountdownLabels();
        }, 1000);
    },

    async reloadAfterExpiry() {
        if (this.isReloadingExpiredListings || !this.ui.modal || this.ui.modal.classList.contains('hidden')) {
            return;
        }

        this.isReloadingExpiredListings = true;

        try {
            await this.load();

            if (typeof refreshInventory === 'function') {
                await refreshInventory();
            }
        } finally {
            this.isReloadingExpiredListings = false;
        }
    },

    updateCountdownLabels() {
        const countdownNodes = document.querySelectorAll('.auction-slot[data-expires-at-ts]');
        let hasExpiredVisibleListing = false;

        countdownNodes.forEach((slot) => {
            const expiresAtTs = Number(slot.dataset.expiresAtTs || 0);
            if (!expiresAtTs) {
                return;
            }

            const remainingSeconds = Math.max(0, expiresAtTs - Math.floor(Date.now() / 1000));
            const timerElement = slot.querySelector('.item-timer');

            if (timerElement) {
                timerElement.textContent = remainingSeconds > 0
                    ? this.formatRemainingTime({ expires_at_ts: expiresAtTs })
                    : 'Истекло';
            }

            if (remainingSeconds <= 0) {
                hasExpiredVisibleListing = true;
            }
        });

        if (hasExpiredVisibleListing) {
            this.reloadAfterExpiry();
        }
    },

    async submitSelectedRod() {
        const price = Number(this.ui.priceInput?.value || 0);
        const fee = this.calculateListingFee(price);

        if (!this.selectedRod) {
            Log.warning('Сначала выберите удочку в инвентаре.');
            return;
        }

        if (!Number.isFinite(price) || price <= 0) {
            Log.warning('Введите корректную цену для аукциона.');
            return;
        }

        try {
            const result = await API.sellRodAtAuction(this.selectedRod.id, price);
            const nextBalance = Number.isFinite(Number(result?.balance))
                ? Number(result.balance)
                : Number((typeof GameState !== 'undefined' ? GameState.balance : 0) || 0) - Number(result?.commission_fee ?? fee);

            if (typeof GameState !== 'undefined') {
                GameState.balance = nextBalance;
            }

            UIManager.updateBalance(nextBalance);
            Log.success(`Удочка "${this.selectedRod.name}" выставлена за ${this.formatNumber(price)} 💰. Комиссия: ${this.formatNumber(result.commission_fee ?? fee)} 💰`);
            this.closeSellModal();
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
