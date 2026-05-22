// ============================================
// NEON FURY — Save System (localStorage)
// Persists high scores, upgrades, and settings
// ============================================

const SAVE_KEY = 'neonfury_save_v2';

// Default save data structure
const DEFAULT_SAVE = {
    highScore: 0,
    highWave: 0,
    totalKills: 0,
    // Upgrade levels (0 = base, max = 5 each)
    upgrades: { damage: 0, health: 0, speed: 0, energy: 0 },
    // Unlocked abilities
    abilities: { doubleJump: false, teleport: false, rageMode: false, timeFreeze: false, drone: false },
    // Player settings
    settings: { musicVolume: 0.15, sfxVolume: 0.3, showFps: false },
    // Accumulated upgrade points (score currency)
    upgradePoints: 0,
};

export class SaveManager {
    constructor() {
        this.data = this._load();
    }

    /** Load save data from localStorage, merging with defaults */
    _load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Deep merge with defaults to handle new fields
                return this._merge(DEFAULT_SAVE, parsed);
            }
        } catch (e) {
            console.warn('Failed to load save data:', e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }

    /** Deep merge: use saved values where they exist, defaults otherwise */
    _merge(defaults, saved) {
        const result = {};
        for (const key of Object.keys(defaults)) {
            if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                result[key] = this._merge(defaults[key], saved[key] || {});
            } else {
                result[key] = saved[key] !== undefined ? saved[key] : defaults[key];
            }
        }
        return result;
    }

    /** Save current data to localStorage */
    save() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save data:', e);
        }
    }

    /** Update high score if current is higher */
    updateHighScore(score, wave, kills) {
        let updated = false;
        if (score > this.data.highScore) { this.data.highScore = score; updated = true; }
        if (wave > this.data.highWave) { this.data.highWave = wave; updated = true; }
        this.data.totalKills += kills;
        // Award upgrade points (10% of score)
        this.data.upgradePoints += Math.floor(score * 0.1);
        if (updated) this.save();
        return updated;
    }

    /** Get upgrade level for a stat */
    getUpgradeLevel(stat) { return this.data.upgrades[stat] || 0; }

    /** Get the multiplier for an upgrade stat */
    getUpgradeMultiplier(stat) {
        const level = this.getUpgradeLevel(stat);
        switch (stat) {
            case 'damage': return 1 + level * 0.2;   // +20% per level
            case 'health': return 1 + level * 0.25;   // +25% per level
            case 'speed':  return 1 + level * 0.1;    // +10% per level
            case 'energy': return 1 + level * 0.15;   // +15% faster recharge per level
            default: return 1;
        }
    }

    /** Get cost for next upgrade level */
    getUpgradeCost(stat) {
        const level = this.getUpgradeLevel(stat);
        return (level + 1) * 500; // 500, 1000, 1500, 2000, 2500
    }

    /** Purchase an upgrade, returns true if successful */
    purchaseUpgrade(stat) {
        const level = this.getUpgradeLevel(stat);
        if (level >= 5) return false; // Max level
        const cost = this.getUpgradeCost(stat);
        if (this.data.upgradePoints < cost) return false;
        this.data.upgradePoints -= cost;
        this.data.upgrades[stat] = level + 1;
        this.save();
        return true;
    }

    /** Unlock an ability */
    unlockAbility(name) {
        if (this.data.abilities[name] !== undefined) {
            this.data.abilities[name] = true;
            this.save();
        }
    }

    /** Check if ability is unlocked */
    hasAbility(name) { return this.data.abilities[name] === true; }

    /** Reset all save data */
    reset() {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        this.save();
    }
}
