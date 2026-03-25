/**
 * Rod Module - Управление удочками и инвентарем
 */

const RodManager = {
    currentRods: [],
    activeRodId: null,

    formatPropertyValue(propName, tier) {
        const value = window.ROD_PROPERTY_VALUES[propName]?.[tier];
        if (value === undefined) return '';
        
        switch (propName) {
            case 'reward':
            case 'xp':
                return `x${value.toFixed(1)}`;
            case 'luck':
            case 'speed':
            case 'crit':
                return `+${(value * 100).toFixed(0)}%`;
            case 'durability':
                return value === -1 ? '∞' : `${value} раз`;
            case 'power':
                return `x${value.toFixed(1)}`;
            case 'piercing':
                return `+${value}`;
            default:
                return value;
        }
    },

    parseProperties(rod) {
        return typeof rod.properties === 'string' ? JSON.parse(rod.properties) : (rod.properties || {});
    },

    calculateEffectiveDamage(rod) {
        const properties = this.parseProperties(rod);
        const minDamage = rod.min_damage || 1;
        const maxDamage = rod.max_damage || 3;
        
        // Применяем множитель power если он есть
        let powerMult = 1.0;
        if ('power' in properties) {
            const tier = properties['power'];
            powerMult = window.ROD_PROPERTY_VALUES['power']?.[tier] || 1.0;
        }
        
        const effectiveMin = Math.round(minDamage * powerMult);
        const effectiveMax = Math.round(maxDamage * powerMult);
        
        console.log('[RodManager.calculateEffectiveDamage]', {
            rodName: rod.name,
            minDamage,
            maxDamage,
            powerTier: properties['power'] || 'нет',
            powerMult,
            effectiveMin,
            effectiveMax
        });
        
        return {
            base: { min: minDamage, max: maxDamage },
            effective: { min: effectiveMin, max: effectiveMax },
            powerMult: powerMult,
            hasChanges: powerMult !== 1.0
        };
    },

    renderRodInfo(rod, rodInfoElement) {
        if (!rod) {
            UIManager.setHTML(rodInfoElement, '<div class="empty">Нет удочки</div>');
            return;
        }

        const properties = this.parseProperties(rod);
        const durability = rod.durability !== undefined ? rod.durability : 0;
        const damage = this.calculateEffectiveDamage(rod);
        const damageRange = `${damage.effective.min}-${damage.effective.max}`;
        
        let propertiesHTML = '';
        if (Object.keys(properties).length > 0) {
            propertiesHTML = '<div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; margin-top: 8px;">';
            const propOrder = ['reward', 'xp', 'luck', 'speed', 'power', 'piercing', 'crit'];
            
            for (const propName of propOrder) {
                if (propName in properties) {
                    const tier = properties[propName];
                    const displayName = window.ROD_PROPERTY_NAMES[propName] || propName;
                    const value = this.formatPropertyValue(propName, tier);
                    propertiesHTML += `<div style="margin: 4px 0; font-size: 0.9em;">
                        ${displayName} ${value} <span style="font-size: 0.8em; color: rgba(255,255,255,0.5);">(${tier}/10)</span>
                    </div>`;
                }
            }
            propertiesHTML += '</div>';
        }

        const durabilityText = durability > 0 ? `${durability} забросов` : 'Сломана';
        const durabilityColor = durability > 100 ? '#34c759' : (durability > 50 ? '#ff9500' : '#ff3b30');

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
