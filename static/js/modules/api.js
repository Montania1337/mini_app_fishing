/**
 * API Module - Запросы к серверу
 */

const API = {
    async request(endpoint, body = {}) {
        try {
            // Получаем пользователя из GameState если доступен, иначе из window.user
            const user = (typeof GameState !== 'undefined' && GameState) ? 
                { id: window.user.id, first_name: window.user.first_name } : 
                window.user;
            
            const res = await fetch(`/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...user, ...body })
            });
            
            if (!res.ok) {
                let errMsg = 'Ошибка сервера';
                try {
                    const err = await res.json();
                    errMsg = err.detail || 'Ошибка сервера';
                } catch (e) {
                    try {
                        errMsg = await res.text();
                    } catch (e2) {
                        errMsg = `Ошибка ${res.status}: ${res.statusText}`;
                    }
                }
                throw new Error(errMsg);
            }
            return await res.json();
        } catch (e) {
            console.error(`Ошибка в запросе ${endpoint}:`, e);
            // Log может быть не инициализирован на момент первого обращения
            if (typeof Log !== 'undefined' && Log.show) {
                Log.show(e.message, 'error');
            }
            throw e;
        }
    },

    login() {
        return this.request('login');
    },

    fish() {
        return this.request('fish');
    },

    strikeFish() {
        return this.request('strike-fish');
    },

    buyRod() {
        return this.request('buy-rod');
    },

    equipRod(rodId) {
        return this.request('set-active', { rod_id: rodId });
    },

    deleteRod(rodId) {
        return this.request('delete-rod', { rod_id: rodId });
    },

    deleteRodsBelowGearScore(minGearScore) {
        return this.request('delete-rods-below-gs', { min_gear_score: minGearScore });
    },

    swapRods(fromIndex, toIndex) {
        return this.request('swap-rods', { from_index: fromIndex, to_index: toIndex });
    },

    getAchievements() {
        return this.request('achievements');
    },

    getLeaderboard() {
        return this.request('leaderboard');
    },

    getAuctionListings() {
        return this.request('auction/listings');
    },

    sellRodAtAuction(rodId, price) {
        return this.request('auction/sell', { rod_id: rodId, price });
    },

    cancelAuctionListing(listingId) {
        return this.request('auction/cancel', { listing_id: listingId });
    },

    buyAuctionListing(listingId) {
        return this.request('auction/buy', { listing_id: listingId });
    },

    async getConstants() {
        try {
            const res = await fetch('/api/constants', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) {
                throw new Error(`Ошибка при загрузке констант: ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error('Ошибка при загрузке констант:', e);
            throw e;
        }
    },

    upgradeRod(rodId) {
        return this.request('upgrade-rod', { rod_id: rodId });
    }
};
