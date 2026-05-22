// ============================================
// NEON FURY — Player Class
// Movement, combat, abilities, and rendering
// ============================================

import { WORLD, COLORS, Projectile, clamp } from './utils.js';

export class Player {
    constructor(x, y, saveManager) {
        // Position & dimensions
        this.x = x; this.y = y;
        this.w = 32; this.h = 52;
        // Velocity
        this.vx = 0; this.vy = 0;
        // Base stats (modified by upgrades)
        this.baseSpeed = 220;
        this.jumpForce = -420;
        this.maxHp = 100;
        this.hp = 100;
        // Apply saved upgrades
        if (saveManager) {
            this.maxHp = Math.floor(100 * saveManager.getUpgradeMultiplier('health'));
            this.hp = this.maxHp;
            this.baseSpeed = Math.floor(220 * saveManager.getUpgradeMultiplier('speed'));
            this.damageMultiplier = saveManager.getUpgradeMultiplier('damage');
            this.energyMultiplier = saveManager.getUpgradeMultiplier('energy');
        } else {
            this.damageMultiplier = 1;
            this.energyMultiplier = 1;
        }
        this.speed = this.baseSpeed;
        // Direction: 1=right, -1=left
        this.facing = 1;
        this.grounded = false;
        // State machine for animation
        this.state = 'idle'; // idle, walk, jump, punch, kick, blast, hurt
        this.stateTimer = 0;
        this.attackBox = null;
        // Invincibility frames after taking damage
        this.invincible = 0;
        // Combo tracking
        this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
        // Power-up timers
        this.shieldActive = false; this.shieldTimer = 0;
        this.speedBoost = false; this.speedTimer = 0;
        // Animation
        this.animFrame = 0; this.animTimer = 0;
        // Cooldowns
        this.blastCooldown = 0;
        this.punchCooldown = 0;
        this.kickCooldown = 0;
        // ---- NEW: Abilities ----
        this.canDoubleJump = saveManager ? saveManager.hasAbility('doubleJump') : false;
        this.hasDoubleJumped = false;
        this.canTeleport = saveManager ? saveManager.hasAbility('teleport') : false;
        this.teleportCooldown = 0;
        // Rage mode (activated at low HP)
        this.rageMode = false; this.rageTimer = 0;
        this.canRage = saveManager ? saveManager.hasAbility('rageMode') : false;
        // Time freeze
        this.canTimeFreeze = saveManager ? saveManager.hasAbility('timeFreeze') : false;
        this.timeFreezeCooldown = 0;
        this.timeFreezeActive = false; this.timeFreezeTimer = 0;
        // Drone companion
        this.hasDrone = saveManager ? saveManager.hasAbility('drone') : false;
        this.droneX = x; this.droneY = y - 30;
        this.droneAngle = 0; this.droneShootCooldown = 0;
        // ---- Cheat mode flags ----
        this.godMode = false;
        this.maxPower = false;
        this.invisible = false;
        // Aura effect timer
        this.auraTimer = 0;
    }

    /** Take damage (respects god mode, shield) */
    takeDamage(dmg, knockDir) {
        if (this.godMode || this.invincible > 0 || this.shieldActive) return;
        this.hp = Math.max(0, this.hp - dmg);
        this.invincible = 0.5;
        this.vx = knockDir * 200;
        this.vy = -150;
        this.state = 'hurt'; this.stateTimer = 0.3;
        this.combo = 0;
        // Trigger rage mode at 25% HP
        if (this.canRage && this.hp > 0 && this.hp <= this.maxHp * 0.25 && !this.rageMode) {
            this.rageMode = true; this.rageTimer = 10;
        }
    }

    /** Perform an attack (punch, kick, or energy blast) */
    attack(type, game) {
        if (this.state === 'hurt') return;
        const dmgMult = this.damageMultiplier * (this.rageMode ? 1.5 : 1) * (this.maxPower ? 2 : 1);
        if (type === 'punch' && this.punchCooldown <= 0) {
            this.state = 'punch'; this.stateTimer = 0.25;
            this.punchCooldown = this.maxPower ? 0.1 : 0.3;
            this.attackBox = {
                x: this.x + (this.facing === 1 ? this.w : -20),
                y: this.y + 10, w: 20, h: 20,
                damage: Math.floor(15 * dmgMult)
            };
            game.sound.play('punch');
            game.particles.emit(this.x + (this.facing === 1 ? this.w + 10 : -10), this.y + 20, 5, COLORS.NEON_BLUE, { speed: 100 });
        } else if (type === 'kick' && this.kickCooldown <= 0) {
            this.state = 'kick'; this.stateTimer = 0.3;
            this.kickCooldown = this.maxPower ? 0.12 : 0.35;
            this.attackBox = {
                x: this.x + (this.facing === 1 ? this.w : -28),
                y: this.y + 20, w: 28, h: 24,
                damage: Math.floor(20 * dmgMult)
            };
            game.sound.play('kick');
            game.particles.emit(this.x + (this.facing === 1 ? this.w + 14 : -14), this.y + 32, 6, COLORS.NEON_ORANGE, { speed: 120 });
        } else if (type === 'blast' && (this.blastCooldown <= 0 || this.maxPower)) {
            this.state = 'blast'; this.stateTimer = 0.35;
            this.blastCooldown = this.maxPower ? 0.15 : (0.8 / this.energyMultiplier);
            const proj = new Projectile(
                this.x + (this.facing === 1 ? this.w : 0),
                this.y + this.h / 2, this.facing, 'player'
            );
            proj.damage = Math.floor(25 * dmgMult);
            game.projectiles.push(proj);
            game.sound.play('blast');
            game.particles.emit(this.x + (this.facing === 1 ? this.w : 0), this.y + this.h / 2, 10, COLORS.NEON_PURPLE, { speed: 80 });
        }
    }

    /** Teleport dash in facing direction */
    teleport(game) {
        if (!this.canTeleport || this.teleportCooldown > 0) return;
        this.teleportCooldown = 3;
        const dist = 150;
        // Emit particles at old position
        game.particles.emit(this.x + this.w / 2, this.y + this.h / 2, 15, COLORS.NEON_BLUE, { speed: 150 });
        game.effects.flash(COLORS.NEON_BLUE, 0.1, 0.2);
        // Move
        this.x += this.facing * dist;
        this.x = clamp(this.x, 0, WORLD.W - this.w);
        // Emit particles at new position
        game.particles.emit(this.x + this.w / 2, this.y + this.h / 2, 15, COLORS.NEON_BLUE, { speed: 150 });
        game.sound.play('teleport');
    }

    /** Activate time freeze */
    activateTimeFreeze(game) {
        if (!this.canTimeFreeze || this.timeFreezeCooldown > 0) return;
        this.timeFreezeActive = true;
        this.timeFreezeTimer = 3;
        this.timeFreezeCooldown = 15;
        game.effects.flash(COLORS.NEON_BLUE, 0.2, 0.3);
        game.sound.play('shield');
    }

    /** Add to combo counter */
    addCombo() {
        this.combo++; this.comboTimer = 2;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    }

    /** Main update — runs every frame */
    update(dt, keys, platforms, worldW, worldH) {
        // God mode: always full HP
        if (this.godMode) this.hp = this.maxHp;
        // Cooldowns
        if (this.punchCooldown > 0) this.punchCooldown -= dt;
        if (this.kickCooldown > 0) this.kickCooldown -= dt;
        if (this.blastCooldown > 0) this.blastCooldown -= dt;
        if (this.invincible > 0) this.invincible -= dt;
        if (this.teleportCooldown > 0) this.teleportCooldown -= dt;
        if (this.timeFreezeCooldown > 0) this.timeFreezeCooldown -= dt;
        // Combo timer
        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
        // Shield & speed timers
        if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.shieldActive = false; }
        if (this.speedTimer > 0) { this.speedTimer -= dt; if (this.speedTimer <= 0) this.speedBoost = false; }
        // Rage timer
        if (this.rageMode) { this.rageTimer -= dt; if (this.rageTimer <= 0) this.rageMode = false; }
        // Time freeze timer
        if (this.timeFreezeActive) { this.timeFreezeTimer -= dt; if (this.timeFreezeTimer <= 0) this.timeFreezeActive = false; }
        // State timer
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) { this.state = 'idle'; this.attackBox = null; }
        }
        // Movement
        const canMove = this.state === 'idle' || this.state === 'walk' || this.state === 'jump';
        const spd = this.speed * (this.speedBoost ? 1.5 : 1) * (this.rageMode ? 1.2 : 1);
        if (canMove) {
            this.vx = 0;
            if (keys['a'] || keys['arrowleft']) { this.vx = -spd; this.facing = -1; }
            if (keys['d'] || keys['arrowright']) { this.vx = spd; this.facing = 1; }
            // Jump
            if ((keys[' '] || keys['w'] || keys['arrowup']) && this.grounded) {
                this.vy = this.jumpForce; this.grounded = false; this.hasDoubleJumped = false;
            }
            // Double jump (mid-air, one-shot)
            else if ((keys[' '] || keys['w'] || keys['arrowup']) && !this.grounded && this.canDoubleJump && !this.hasDoubleJumped) {
                if (!keys['_djUsed']) { // Prevent holding key
                    this.vy = this.jumpForce * 0.8; this.hasDoubleJumped = true;
                    keys['_djUsed'] = true;
                }
            }
        }
        // Reset double jump key lock when released
        if (!(keys[' '] || keys['w'] || keys['arrowup'])) keys['_djUsed'] = false;
        // Gravity
        this.vy += WORLD.GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        // Platform collision
        this.grounded = false;
        for (const p of platforms) {
            if (this.x + this.w > p.x && this.x < p.x + p.w &&
                this.y + this.h > p.y && this.y + this.h < p.y + p.h + 10 && this.vy >= 0) {
                this.y = p.y - this.h; this.vy = 0; this.grounded = true;
            }
        }
        // World bounds
        this.x = clamp(this.x, 0, worldW - this.w);
        if (this.y + this.h > WORLD.GROUND_Y) {
            this.y = WORLD.GROUND_Y - this.h; this.vy = 0; this.grounded = true;
        }
        // Animation state
        if (this.stateTimer <= 0 && this.state !== 'hurt') {
            if (!this.grounded) this.state = 'jump';
            else if (Math.abs(this.vx) > 10) this.state = 'walk';
            else this.state = 'idle';
        }
        // Animation frame
        this.animTimer += dt;
        if (this.animTimer > 0.15) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
        // Aura timer
        this.auraTimer += dt;
        // Drone update
        if (this.hasDrone) this._updateDrone(dt);
    }

    /** Update drone companion position and shooting */
    _updateDrone(dt) {
        this.droneAngle += dt * 2;
        const targetX = this.x + this.w / 2 + Math.cos(this.droneAngle) * 30;
        const targetY = this.y - 25 + Math.sin(this.droneAngle * 0.5) * 8;
        this.droneX += (targetX - this.droneX) * 8 * dt;
        this.droneY += (targetY - this.droneY) * 8 * dt;
        if (this.droneShootCooldown > 0) this.droneShootCooldown -= dt;
    }

    /** Let drone fire at nearest enemy — called from game update */
    droneShoot(enemies, projectiles) {
        if (!this.hasDrone || this.droneShootCooldown > 0 || enemies.length === 0) return;
        // Find nearest enemy
        let nearest = null, minDist = Infinity;
        for (const e of enemies) {
            const d = Math.sqrt((e.x - this.droneX) ** 2 + (e.y - this.droneY) ** 2);
            if (d < minDist && d < 300) { minDist = d; nearest = e; }
        }
        if (nearest) {
            this.droneShootCooldown = 1.5;
            const dir = nearest.x > this.droneX ? 1 : -1;
            const proj = new Projectile(this.droneX, this.droneY, dir, 'player');
            proj.damage = 10; proj.speed = 400;
            projectiles.push(proj);
        }
    }

    /** Draw the player character */
    draw(ctx) {
        ctx.save();
        // Apply invisible mode transparency BEFORE drawing
        if (this.invisible) ctx.globalAlpha = 0.4;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        // Blink when invincible
        if (this.invincible > 0 && Math.floor(this.invincible * 20) % 2) { ctx.restore(); return; }
        ctx.translate(cx, cy); ctx.scale(this.facing, 1); ctx.translate(-cx, -cy);
        // ---- GOD MODE AURA ----
        if (this.godMode) {
            const auraSize = 36 + Math.sin(this.auraTimer * 4) * 4;
            ctx.fillStyle = `rgba(255,51,51,${0.1 + Math.sin(this.auraTimer * 3) * 0.05})`;
            ctx.shadowColor = COLORS.NEON_RED; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.ellipse(cx, cy, auraSize, auraSize + 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // ---- MAX POWER AURA ----
        if (this.maxPower) {
            // Blue lightning arcs
            ctx.strokeStyle = COLORS.NEON_BLUE; ctx.lineWidth = 1;
            ctx.shadowColor = COLORS.NEON_BLUE; ctx.shadowBlur = 10;
            for (let i = 0; i < 3; i++) {
                const a = this.auraTimer * 5 + i * 2.1;
                const r = 25 + Math.sin(a) * 8;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                ctx.lineTo(cx + Math.cos(a + 0.5) * (r + 5), cy + Math.sin(a + 0.5) * (r - 3));
                ctx.lineTo(cx + Math.cos(a + 1) * r, cy + Math.sin(a + 1) * r);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        // ---- RAGE MODE AURA ----
        if (this.rageMode) {
            const rSize = 30 + Math.sin(this.auraTimer * 6) * 3;
            ctx.fillStyle = `rgba(255,100,0,${0.08 + Math.sin(this.auraTimer * 4) * 0.04})`;
            ctx.shadowColor = COLORS.NEON_ORANGE; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.ellipse(cx, cy, rSize, rSize + 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // Shield bubble
        if (this.shieldActive) {
            ctx.strokeStyle = COLORS.NEON_BLUE; ctx.lineWidth = 2;
            ctx.shadowColor = COLORS.NEON_BLUE; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.ellipse(cx, cy, 28, 34, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        // ---- PIXEL ART CHARACTER ----
        const bx = this.x, by = this.y;
        // Body
        ctx.fillStyle = '#1a1a4e'; ctx.fillRect(bx + 8, by + 16, 16, 20);
        ctx.fillStyle = COLORS.NEON_BLUE;
        ctx.fillRect(bx + 8, by + 16, 16, 2);
        ctx.fillRect(bx + 12, by + 18, 2, 16);
        ctx.fillRect(bx + 18, by + 18, 2, 16);
        // Head
        ctx.fillStyle = '#e8c4a0'; ctx.fillRect(bx + 10, by + 4, 12, 12);
        // Hair
        ctx.fillStyle = COLORS.NEON_PURPLE;
        ctx.fillRect(bx + 9, by + 2, 14, 6); ctx.fillRect(bx + 8, by + 4, 2, 8);
        // Eyes
        ctx.fillStyle = COLORS.NEON_BLUE;
        ctx.shadowColor = COLORS.NEON_BLUE; ctx.shadowBlur = 4;
        ctx.fillRect(bx + 14, by + 9, 3, 2); ctx.fillRect(bx + 19, by + 9, 3, 2);
        ctx.shadowBlur = 0;
        // Visor
        ctx.fillStyle = 'rgba(0,240,255,0.3)'; ctx.fillRect(bx + 13, by + 8, 10, 4);
        // Arms
        ctx.fillStyle = '#1a1a4e';
        if (this.state === 'punch') {
            ctx.fillRect(bx + 24, by + 18, 16, 6);
            ctx.fillStyle = COLORS.NEON_BLUE; ctx.fillRect(bx + 38, by + 18, 4, 6);
        } else if (this.state === 'kick') {
            ctx.fillRect(bx + 4, by + 18, 6, 6); ctx.fillRect(bx + 22, by + 18, 6, 6);
        } else if (this.state === 'blast') {
            ctx.fillRect(bx + 24, by + 16, 12, 6);
            ctx.fillStyle = COLORS.NEON_PURPLE; ctx.shadowColor = COLORS.NEON_PURPLE; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(bx + 38, by + 19, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillRect(bx + 4, by + 18, 6, 6); ctx.fillRect(bx + 22, by + 18, 6, 6);
        }
        // Legs
        ctx.fillStyle = '#0a0a2e';
        if (this.state === 'walk') {
            const lo = Math.sin(this.animFrame * Math.PI / 2) * 4;
            ctx.fillRect(bx + 10, by + 36, 5, 16 + lo); ctx.fillRect(bx + 17, by + 36, 5, 16 - lo);
        } else if (this.state === 'kick') {
            ctx.fillRect(bx + 10, by + 36, 5, 16);
            ctx.fillRect(bx + 17, by + 36, 22, 5);
            ctx.fillStyle = COLORS.NEON_ORANGE; ctx.fillRect(bx + 37, by + 36, 4, 5);
        } else if (this.state === 'jump') {
            ctx.fillRect(bx + 9, by + 36, 5, 10); ctx.fillRect(bx + 18, by + 36, 5, 10);
        } else {
            ctx.fillRect(bx + 10, by + 36, 5, 16); ctx.fillRect(bx + 17, by + 36, 5, 16);
        }
        // Boots
        ctx.fillStyle = COLORS.NEON_BLUE;
        if (this.state !== 'kick' && this.state !== 'jump') {
            ctx.fillRect(bx + 9, by + 50, 7, 2); ctx.fillRect(bx + 16, by + 50, 7, 2);
        }

        ctx.restore();
        // ---- DRONE COMPANION ----
        if (this.hasDrone) this._drawDrone(ctx);
    }

    /** Draw the drone companion */
    _drawDrone(ctx) {
        ctx.save();
        ctx.translate(this.droneX, this.droneY);
        // Body
        ctx.fillStyle = '#222';
        ctx.shadowColor = COLORS.NEON_GREEN; ctx.shadowBlur = 8;
        ctx.fillRect(-6, -4, 12, 8);
        // Eye
        ctx.fillStyle = COLORS.NEON_GREEN;
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        // Propellers
        const pw = 4 + Math.sin(Date.now() * 0.02) * 2;
        ctx.fillStyle = 'rgba(0,240,255,0.5)';
        ctx.fillRect(-8, -6, pw, 2); ctx.fillRect(8 - pw, -6, pw, 2);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
