/**
 * Rod Module - shared rod rendering and calculations.
 */

// import {propOrder} from './constants.js'

const RodManager = {
    currentRods: [],
    activeRodId: null,

    resolveActiveRod(rods = [], activeRod = null) {
        if (activeRod?.id !== undefined && activeRod?.id !== null) {
            const freshActiveRod = rods.find((rod) => rod.id === activeRod.id);
            if (freshActiveRod) {
                return freshActiveRod;
            }
        }

        return rods.find((rod) => rod.is_active) || activeRod || null;
    },

    formatPropertyValue(propName, tier) {
        const value = window.ROD_PROPERTY_VALUES[propName]?.[tier];
        if (value === undefined) return '';

        switch (propName) {
            case 'rod_reward_increase':
            case 'xp':
                return `x${value.toFixed(1)}`;
            case 'rod_luck_increase':
            case 'speed':
            case 'rod_crit_chance_increase':
                return `+${(value * 100).toFixed(0)}%`;
            case 'rod_durability_increase':
                return value === -1 ? '∞' : `${value} раз`;
            case 'rod_power_increase':
                return `x${value.toFixed(1)}`;
            case 'rod_piercing_increase':
                return `+${value}`;
            default:
                return value;
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

        return rod.properties || {};
    },

    getTierDescription(tier) {
        if (tier <= 3) return 'низкий';
        if (tier <= 6) return 'средний';
        return 'высокий';
    },

    getDamageLabel(rod) {
        const damage = this.calculateEffectiveDamage(rod);
        return `${damage.effective.min}-${damage.effective.max}`;
    },

    getDurabilityLabel(durability) {
        return durability === -1 ? '♾️' : String(durability);
    },

    getDurabilityClass(durability) {
        if (durability === -1) return 'infinite';
        if (durability <= 10) return 'low';
        if (durability <= 50) return 'medium';
        return 'high';
    },

    getGearScoreClass(gearScore) {
        if (gearScore > 35) return 'gs-tier-35';
        if (gearScore > 25) return 'gs-tier-25';
        if (gearScore > 15) return 'gs-tier-15';
        return '';
    },

    buildSlotHTML(rod, options = {}) {
        const {
            slotType = 'inventory',
            active = false,
            myLot = false,
            selected = false,
            sellerLabel = '',
            priceLabel = '',
            timeLabel = '',
            expiresAtTs = null,
            index = null,
            listingId = null
        } = options;

        const durability = Number(rod?.durability ?? 0);
        const gearScore = Number(rod?.gear_score ?? 0);
        const durabilityClass = this.getDurabilityClass(durability);
        const gearScoreClass = this.getGearScoreClass(gearScore);
        const durabilityValue = this.getDurabilityLabel(durability);
        const classes = [
            'inventory-slot',
            slotType === 'auction' ? 'auction-slot' : '',
            active ? 'active' : '',
            myLot ? 'my-lot' : '',
            selected ? 'selected-lot' : '',
            myLot && !selected ? 'is-owned' : '',
            gearScoreClass
        ].filter(Boolean).join(' ');
        const attrs = [];

        if (index !== null && index !== undefined) {
            attrs.push(`data-index="${this.escapeAttribute(String(index))}"`);
        }

        if (rod?.id !== undefined && rod?.id !== null) {
            attrs.push(`data-rod-id="${this.escapeAttribute(String(rod.id))}"`);
        }

        if (listingId !== null && listingId !== undefined) {
            attrs.push(`data-listing-id="${this.escapeAttribute(String(listingId))}"`);
        }

        if (expiresAtTs !== null && expiresAtTs !== undefined) {
            attrs.push(`data-expires-at-ts="${this.escapeAttribute(String(expiresAtTs))}"`);
        }

        const priceMarkup = priceLabel
            ? `<div class="item-price">${this.escapeHtml(priceLabel)}</div>`
            : '';
        const timeMarkup = timeLabel
            ? `<div class="item-timer">${this.escapeHtml(timeLabel)}</div>`
            : '';
        const sellerMarkup = sellerLabel
            ? `<div class="item-seller">${this.escapeHtml(sellerLabel)}</div>`
            : '';

        return `
            <div class="${classes}" ${attrs.join(' ')}>
                ${priceMarkup}
                ${timeMarkup}
                <div class="item-icon">${this.escapeHtml(rod?.emoji || '🎣')}</div>
                <div class="item-name">${this.escapeHtml(rod?.name || 'Удочка')}</div>
                <div class="item-durability durability-${durabilityClass}">${this.escapeHtml(durabilityValue)}</div>
                <div class="item-gear-score">⚙️ ${this.escapeHtml(String(gearScore))}</div>
                ${sellerMarkup}
            </div>
        `;
    },

    getBottomSheetStatsConfig(rod) {
        const upgradeLevel = Number(rod?.upgrade_level || 0);

        return {
            metaText: `Уровень улучшения: ${upgradeLevel}`
        };
    },

    buildPropertyStatsBlocks(rod, options = {}) {
        const {
            variant = 'bottom-sheet',
            emptyState = false
        } = options;

        const properties = this.parseProperties(rod);
        const blocks = [];
        const itemClass = variant === 'tooltip' ? 'tooltip-stat-item' : 'bottom-sheet-stat-item';
        const titleClass = variant === 'tooltip' ? 'tooltip-stat-title' : 'bottom-sheet-stat-title';
        const valueClass = variant === 'tooltip' ? 'tooltip-stat-value' : 'bottom-sheet-stat-value';
        const tierClass = variant === 'tooltip' ? 'tooltip-stat-tier' : 'bottom-sheet-stat-tier';
        const descClass = variant === 'tooltip' ? 'tooltip-stat-desc' : 'bottom-sheet-stat-desc';

        for (const propName of propOrder) {
            if (!(propName in properties)) continue;

            const tier = Number(properties[propName]);
            const tierDesc = this.getTierDescription(tier);
            const value = this.formatPropertyValue(propName, tier) || tier;
            const name = window.ROD_PROPERTY_NAMES?.[propName] || propName;
            const desc = window.ROD_PROPERTY_DESCRIPTIONS?.[propName] || '';

            blocks.push(`
                <div class="${itemClass}" data-tier="${tier}">
                    <div class="${titleClass}">
                        <span>${name}</span>
                        <span class="${valueClass}">${value}</span>
                    </div>
                    <div class="${tierClass}">Уровень ${tier}/10 (${tierDesc})</div>
                    <div class="${descClass}">${desc}</div>
                </div>
            `);
        }

        if (!blocks.length && emptyState) {
            return `
                <div class="${itemClass}">
                    <div class="${titleClass}">
                        <span>Доп. свойства</span>
                        <span class="${valueClass}">Нет</span>
                    </div>
                </div>
            `;
        }

        return blocks.join('');
    },

    buildBottomSheetStatsHTML(rod, options = {}) {
        const damageLabel = this.getDamageLabel(rod);
        const baseConfig = this.getBottomSheetStatsConfig(rod);
        const {
            metaText = baseConfig.metaText
        } = { ...baseConfig, ...options };

        const items = [
            `
                <div class="bottom-sheet-stat-item">
                    <div class="bottom-sheet-stat-title">
                        <span>Урон</span>
                        <span class="bottom-sheet-stat-value">${damageLabel}</span>
                    </div>
                    <div class="bottom-sheet-stat-tier">${metaText}</div>
                </div>
            `
        ];

        const propertyBlocks = this.buildPropertyStatsBlocks(rod, { variant: 'bottom-sheet' });
        return items.join('') + propertyBlocks;
    },

    buildTooltipHTML(rod, options = {}) {
        const {
            extraMetaHTML = ''
        } = options;

        const damageLabel = this.getDamageLabel(rod);
        const upgradeLevel = Number(rod?.upgrade_level || 0);
        const upgradeDisplay = upgradeLevel > 0 ? `+${upgradeLevel}` : 'не улучшена';
        const upgradeColor = upgradeLevel >= 10
            ? '#ffd700'
            : (upgradeLevel >= 7 ? '#ff6b6b' : 'rgba(255,255,255,0.6)');
        const propertiesHTML = this.buildPropertyStatsBlocks(rod, {
            variant: 'tooltip',
            emptyState: true
        });

        return `
            <div class="tooltip-header">
                <h3 class="tooltip-name rarity-${rod.rarity}">${rod.name}</h3>
                <div class="tooltip-damage" style="margin-top: 8px; color: #ff6b6b; font-weight: 600; font-size: 0.95em;">
                    💥 Урон: ${damageLabel}
                </div>
                ${extraMetaHTML}
                <div style="margin-top: 6px; font-size: 0.9em; color: ${upgradeColor};">
                    ⬆️ Улучшение: ${upgradeDisplay}
                </div>
            </div>
            <div class="tooltip-stats">
                <div class="tooltip-stat-header">Характеристики</div>
                ${propertiesHTML}
            </div>
        `;
    },

    calculateEffectiveDamage(rod) {
        const properties = this.parseProperties(rod);
        const minDamage = rod.min_damage || 1;
        const maxDamage = rod.max_damage || 3;

        let powerMult = 1.0;
        if ('rod_power_increase' in properties) {
            const tier = properties.rod_power_increase;
            powerMult = window.ROD_PROPERTY_VALUES.rod_power_increase?.[tier] || 1.0;
        }

        const effectiveMin = Math.round(minDamage * powerMult);
        const effectiveMax = Math.round(maxDamage * powerMult);

        console.log('[RodManager.calculateEffectiveDamage]', {
            rodName: rod.name,
            minDamage,
            maxDamage,
            powerTier: properties.rod_power_increase || 'нет',
            powerMult,
            effectiveMin,
            effectiveMax
        });

        return {
            base: { min: minDamage, max: maxDamage },
            effective: { min: effectiveMin, max: effectiveMax },
            powerMult,
            hasChanges: powerMult !== 1.0
        };
    },

    renderRodInfo(rod, rodInfoElement) {
        if (!rod) {
            UIManager.setHTML(rodInfoElement, '<div class="empty">Нет удочки</div>');
            return;
        }

        const durability = rod.durability !== undefined ? rod.durability : 0;
        const damage = this.calculateEffectiveDamage(rod);
        const damageRange = `${damage.effective.min}-${damage.effective.max}`;

        const durabilityText = durability === -1 ? 'Вечная' : (durability > 0 ? `${durability} забросов` : 'Сломана');
        const durabilityColor = durability === -1 ? '#8a2be2' : (durability > 100 ? '#34c759' : (durability > 50 ? '#ff9500' : '#ff3b30'));

        const html = `
            <div class="rod-name rarity-${rod.rarity}">${rod.name}</div>
            <div style="font-size: 0.9em; margin-top: 8px; font-weight: 600; color: #ff6b6b;">
                💥 Урон: <b>${damageRange}</b>
            </div>
            <div style="font-size: 0.85em; margin-top: 6px; color: ${durabilityColor}; font-weight: 600;">
                💪 Прочность: <b>${durabilityText}</b>
            </div>
        `;

        rodInfoElement.className = `rod-card rarity-${rod.rarity}`;
        UIManager.setHTML(rodInfoElement, html);
    }
};
