// ============================================
// NEON FURY — Cheat Code System & Secrets
// Type cheat codes during gameplay to activate
// ============================================
import { WORLD, COLORS, PowerUp, Meteor, randRange } from './utils.js';
import { SecretBoss } from './enemy.js';

// All available cheat codes
const CHEAT_CODES = {
    'godmode':   { name: 'GOD MODE',   desc: 'INDESTRUCTIBLE', color: COLORS.NEON_RED },
    'maxpower':  { name: 'MAX POWER',  desc: 'UNLIMITED ENERGY', color: COLORS.NEON_BLUE },
    'killall':   { name: 'KILL ALL',   desc: 'ANNIHILATE', color: COLORS.NEON_ORANGE },
    'moneyrain': { name: 'MONEY RAIN', desc: 'SCORE BOOST', color: COLORS.GOLD },
    'slowmo':    { name: 'SLOW MO',    desc: 'TIME WARP', color: COLORS.NEON_PURPLE },
    'bighead':   { name: 'BIG HEAD',   desc: 'COMICAL MODE', color: COLORS.NEON_GREEN },
    'invisible': { name: 'INVISIBLE',  desc: 'GHOST MODE', color: COLORS.NEON_BLUE },
};

export class CheatSystem {
    constructor() {
        // Buffer stores recent key presses to match cheat codes
        this.inputBuffer = '';
        this.maxBuffer = 12;
        // Active cheat states
        this.activeGodMode = false;
        this.activeMaxPower = false;
        this.activeSlowMo = false;
        this.activeBigHead = false;
        this.activeInvisible = false;
        // Notification queue
        this.notification = null;
        this.notifTimer = 0;
        // Secret event timers
        this.meteorShowerTimer = randRange(120, 240); // 2-4 min
        this.secretBossSpawned = false;
        this.weaponCrateTimer = randRange(60, 120);
    }

    /**
     * Handle a keypress — add to buffer and check for cheats
     * @param {string} key - The key that was pressed (lowercase)
     * @param {Object} game - Reference to the Game object
     */
    handleKey(key, game) {
        // Only accept letter keys
        if (key.length !== 1 || !/[a-z]/.test(key)) return;
        this.inputBuffer += key;
        if (this.inputBuffer.length > this.maxBuffer) {
            this.inputBuffer = this.inputBuffer.slice(-this.maxBuffer);
        }
        // Check each cheat code
        for (const [code, info] of Object.entries(CHEAT_CODES)) {
            if (this.inputBuffer.endsWith(code)) {
                this._activateCheat(code, game);
                this.inputBuffer = ''; // Clear buffer after match
                break;
            }
        }
    }

    /**
     * Activate a cheat code
     */
    _activateCheat(code, game) {
        const info = CHEAT_CODES[code];
        game.sound.play('cheat');

        switch (code) {
            case 'godmode':
                this.activeGodMode = !this.activeGodMode;
                game.player.godMode = this.activeGodMode;
                if (this.activeGodMode) game.player.hp = game.player.maxHp;
                break;

            case 'maxpower':
                this.activeMaxPower = !this.activeMaxPower;
                game.player.maxPower = this.activeMaxPower;
                break;

            case 'killall':
                this._killAll(game);
                break;

            case 'moneyrain':
                this._moneyRain(game);
                break;

            case 'slowmo':
                this.activeSlowMo = !this.activeSlowMo;
                // Apply to all current and future enemies
                for (const e of game.enemies) {
                    e.slowMoFactor = this.activeSlowMo ? 0.3 : 1;
                }
                break;

            case 'bighead':
                this.activeBigHead = !this.activeBigHead;
                for (const e of game.enemies) {
                    e.bigHead = this.activeBigHead;
                }
                break;

            case 'invisible':
                this.activeInvisible = !this.activeInvisible;
                game.player.invisible = this.activeInvisible;
                break;
        }

        // Show notification
        const state = (code !== 'killall' && code !== 'moneyrain')
            ? (this._isActive(code) ? 'ON' : 'OFF') : '';
        this.notification = { name: info.name, desc: info.desc + ' ' + state, color: info.color };
        this.notifTimer = 2.5;
    }

    _isActive(code) {
        switch (code) {
            case 'godmode': return this.activeGodMode;
            case 'maxpower': return this.activeMaxPower;
            case 'slowmo': return this.activeSlowMo;
            case 'bighead': return this.activeBigHead;
            case 'invisible': return this.activeInvisible;
            default: return false;
        }
    }

    /**
     * KILLALL — Destroy all enemies with explosion
     */
    _killAll(game) {
        for (const e of game.enemies) {
            game.particles.emit(e.x + e.w / 2, e.y + e.h / 2, 25, e.color, { speed: 250, spread: 20 });
            game.effects.addShockwave(e.x + e.w / 2, e.y + e.h / 2, 60, COLORS.NEON_ORANGE);
            game.score += e.scoreValue;
            game.kills++;
            e.alive = false;
        }
        game.camera.shake(15, 0.5);
        game.effects.flash(COLORS.NEON_ORANGE, 0.2, 0.5);
        game.sound.play('explosion');
    }

    /**
     * MONEYRAIN — Spawn coin powerups everywhere
     */
    _moneyRain(game) {
        for (let i = 0; i < 15; i++) {
            const x = game.player.x + randRange(-400, 400);
            const y = randRange(100, 500);
            game.powerUps.push(new PowerUp(
                Math.max(20, Math.min(x, game.worldW - 20)),
                y, 'coin'
            ));
        }
        game.score += 500;
        game.effects.addFloatingText('+500 BONUS', game.player.x + 16, game.player.y - 20, COLORS.GOLD, 18);
    }

    /**
     * Apply cheat modifiers to newly spawned enemies
     */
    applyToNewEnemies(enemies) {
        for (const e of enemies) {
            if (this.activeSlowMo) e.slowMoFactor = 0.3;
            if (this.activeBigHead) e.bigHead = true;
        }
    }

    /**
     * Update secret events (meteor shower, weapon crate, etc.)
     */
    updateSecrets(dt, game) {
        // Notification timer
        if (this.notifTimer > 0) {
            this.notifTimer -= dt;
            if (this.notifTimer <= 0) this.notification = null;
        }

        // Meteor shower event
        this.meteorShowerTimer -= dt;
        if (this.meteorShowerTimer <= 0) {
            this._triggerMeteorShower(game);
            this.meteorShowerTimer = randRange(120, 240);
        }

        // Hidden weapon crate
        this.weaponCrateTimer -= dt;
        if (this.weaponCrateTimer <= 0) {
            const x = randRange(100, game.worldW - 100);
            game.powerUps.push(new PowerUp(x, 300, 'weapon'));
            this.weaponCrateTimer = randRange(60, 120);
        }

        // Secret boss (after wave 15, once per game)
        if (game.wave >= 15 && !this.secretBossSpawned && Math.random() < 0.005) {
            this.secretBossSpawned = true;
            const bx = game.player.x > game.worldW / 2 ? 200 : game.worldW - 200;
            const sb = new SecretBoss(bx, WORLD.GROUND_Y - 60);
            game.enemies.push(sb);
            this.notification = { name: '??? SECRET BOSS ???', desc: 'VOID KING APPROACHES', color: '#ff00ff' };
            this.notifTimer = 3;
            game.sound.play('boss');
            game.camera.shake(10, 0.5);
        }

        // Golden alien chance (applied during spawn in game.js)
    }

    /**
     * Trigger a meteor shower
     */
    _triggerMeteorShower(game) {
        this.notification = { name: 'METEOR SHOWER', desc: 'INCOMING!', color: COLORS.NEON_ORANGE };
        this.notifTimer = 2;
        game.sound.play('siren');
        // Spawn meteors over 3 seconds
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                if (game.state !== 'playing') return;
                const x = game.player.x + randRange(-300, 300);
                game.meteors.push(new Meteor(Math.max(0, Math.min(x, game.worldW))));
            }, i * 400);
        }
    }

    /**
     * Draw cheat notification popup
     */
    drawNotification(ctx, W, H) {
        if (!this.notification || this.notifTimer <= 0) return;
        const n = this.notification;
        const alpha = Math.min(1, this.notifTimer / 0.3);
        const slideY = (1 - Math.min(1, this.notifTimer / 0.3)) * -20;

        ctx.save();
        ctx.globalAlpha = alpha;
        // Background
        const bw = 320, bh = 60;
        const bx = W / 2 - bw / 2, by = 80 + slideY;
        ctx.fillStyle = 'rgba(5,5,16,0.9)';
        ctx.strokeStyle = n.color;
        ctx.shadowColor = n.color; ctx.shadowBlur = 20;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // Scan line effect
        ctx.fillStyle = `rgba(0,240,255,0.03)`;
        for (let sy = by; sy < by + bh; sy += 3) {
            ctx.fillRect(bx, sy, bw, 1);
        }
        // Text
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color; ctx.shadowBlur = 10;
        ctx.font = 'bold 18px "Orbitron", sans-serif';
        ctx.fillText(n.name, W / 2, by + 22);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aaa';
        ctx.font = '11px "Share Tech Mono", monospace';
        ctx.fillText(n.desc, W / 2, by + 42);
        // Glitch lines
        if (Math.random() > 0.7) {
            ctx.fillStyle = n.color;
            ctx.globalAlpha = 0.3;
            const gy = by + Math.random() * bh;
            ctx.fillRect(bx, gy, bw, 2);
        }
        ctx.restore();
    }
}
