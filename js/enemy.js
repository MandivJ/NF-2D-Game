// ============================================
// NEON FURY — Enemy Classes + Improved AI
// ============================================
import { WORLD, COLORS, Projectile, clamp, distance, randRange } from './utils.js';

// ---- BASE ENEMY CLASS ----
export class Enemy {
    constructor(x, y, config) {
        this.x = x; this.y = y;
        this.w = config.w || 30; this.h = config.h || 40;
        this.vx = 0; this.vy = 0;
        this.speed = config.speed || 80;
        this.hp = config.hp || 30; this.maxHp = config.hp || 30;
        this.damage = config.damage || 5;
        this.type = config.type || 'fast';
        this.color = config.color || COLORS.NEON_GREEN;
        this.alive = true; this.grounded = false;
        this.attackCooldown = 0; this.attackRate = config.attackRate || 1;
        this.state = 'idle'; this.stateTimer = 0;
        this.animFrame = 0; this.animTimer = 0;
        this.knockback = 0; this.scoreValue = config.score || 100;
        this.flying = config.flying || false;
        this.hasHitThisAttack = false;
        // AI improvements
        this.dodgeCooldown = 0;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;
        // Cheat modifiers
        this.slowMoFactor = 1;
        this.bigHead = false;
        this.isGolden = false;
    }

    takeDamage(dmg, knockDir) {
        this.hp -= dmg;
        this.knockback = knockDir * 150;
        this.vy = -100;
        this.state = 'hurt'; this.stateTimer = 0.2;
        if (this.hp <= 0) this.alive = false;
    }

    update(dt, player, platforms, worldW, worldH) {
        const sDt = dt * this.slowMoFactor;
        if (this.stateTimer > 0) { this.stateTimer -= sDt; if (this.stateTimer <= 0) this.state = 'idle'; }
        if (this.attackCooldown > 0) this.attackCooldown -= sDt;
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= sDt;
        this.animTimer += sDt;
        if (this.animTimer > 0.2) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }

        // Skip AI if player is invisible
        if (player.invisible) {
            this.vx *= 0.95;
            if (!this.flying) this.vy += WORLD.GRAVITY * sDt;
            this._applyPhysics(sDt, platforms, worldW, worldH);
            return null;
        }

        if (this.state !== 'hurt') {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Dodge: strafe when player is attacking nearby
            if (player.state === 'punch' || player.state === 'kick' || player.state === 'blast') {
                if (dist < 120 && this.dodgeCooldown <= 0) {
                    this.vx = this.strafeDir * this.speed * 1.5;
                    this.dodgeCooldown = 1.5;
                    this.strafeDir *= -1;
                }
            }
            // Surround: flank player from alternating sides
            else if (dist > 40) {
                this.strafeTimer -= sDt;
                if (this.strafeTimer <= 0) { this.strafeDir = Math.random() > 0.5 ? 1 : -1; this.strafeTimer = 2; }
                this.vx = Math.sign(dx) * this.speed;
                if (this.flying) this.vy = Math.sign(dy) * this.speed * 0.7;
                // Retreat when low HP
                if (this.hp < this.maxHp * 0.2 && dist < 150) {
                    this.vx = -Math.sign(dx) * this.speed * 1.2;
                }
            } else {
                this.vx = 0;
                if (this.attackCooldown <= 0) {
                    this.state = 'attack'; this.stateTimer = 0.3;
                    this.attackCooldown = this.attackRate;
                    this.hasHitThisAttack = false;
                }
            }
        } else {
            this.vx = this.knockback; this.knockback *= 0.9;
        }

        if (!this.flying) this.vy += WORLD.GRAVITY * sDt;
        this._applyPhysics(sDt, platforms, worldW, worldH);
        return null;
    }

    _applyPhysics(dt, platforms, worldW, worldH) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (!this.flying) {
            this.grounded = false;
            for (const p of platforms) {
                if (this.x + this.w > p.x && this.x < p.x + p.w &&
                    this.y + this.h > p.y && this.y + this.h < p.y + p.h + 10 && this.vy >= 0) {
                    this.y = p.y - this.h; this.vy = 0; this.grounded = true;
                }
            }
            if (this.y + this.h > WORLD.GROUND_Y) {
                this.y = WORLD.GROUND_Y - this.h; this.vy = 0; this.grounded = true;
            }
        }
        this.x = clamp(this.x, 0, worldW - this.w);
        if (this.flying) this.y = clamp(this.y, 40, WORLD.GROUND_Y - 80);
    }

    isAttacking(player) {
        if (this.state !== 'attack' || this.hasHitThisAttack) return false;
        const hit = this.x < player.x + player.w && this.x + this.w > player.x &&
                    this.y < player.y + player.h && this.y + this.h > player.y;
        if (hit) this.hasHitThisAttack = true;
        return hit;
    }

    drawHealthBar(ctx) {
        const pct = this.hp / this.maxHp;
        const bw = this.isGolden ? 36 : 30, bh = 4;
        const bx = this.x + this.w / 2 - bw / 2, by = this.y - (this.bigHead ? 20 : 10);
        ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = pct > 0.5 ? COLORS.NEON_GREEN : pct > 0.25 ? COLORS.NEON_YELLOW : COLORS.NEON_PINK;
        if (this.isGolden) ctx.fillStyle = COLORS.GOLD;
        ctx.fillRect(bx, by, bw * pct, bh);
    }
}

// ---- FAST ALIEN ----
export class FastAlien extends Enemy {
    constructor(x, y) {
        super(x, y, { w: 24, h: 36, speed: 160, hp: 30, damage: 5, type: 'fast', color: COLORS.NEON_GREEN, attackRate: 0.8, score: 100 });
    }
    draw(ctx) {
        const bx = this.x, by = this.y;
        ctx.globalAlpha = this.state === 'hurt' ? 0.5 : 1;
        const headScale = this.bigHead ? 1.6 : 1;
        ctx.fillStyle = '#0a2a0a'; ctx.fillRect(bx + 4, by + 10, 16, 18);
        ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color; ctx.fillRect(bx + 2, by + 12, 20, 14);
        // Head
        ctx.save();
        if (this.bigHead) { ctx.translate(bx + 12, by + 8); ctx.scale(headScale, headScale); ctx.translate(-(bx + 12), -(by + 8)); }
        ctx.fillStyle = this.isGolden ? '#aa8800' : '#1a4a1a';
        ctx.beginPath(); ctx.ellipse(bx + 12, by + 8, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color;
        ctx.beginPath(); ctx.ellipse(bx + 12, by + 7, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.NEON_PINK; ctx.shadowColor = COLORS.NEON_PINK; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(bx + 7, by + 6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 12, by + 4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 17, by + 6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Legs
        ctx.fillStyle = '#0a3a0a';
        const lo = Math.sin(this.animFrame * Math.PI / 2) * 3;
        ctx.fillRect(bx + 5, by + 26, 3, 10 + lo); ctx.fillRect(bx + 16, by + 26, 3, 10 - lo);
        if (this.state === 'attack') {
            ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color;
            ctx.fillRect(bx - 4, by + 14, 8, 3); ctx.fillRect(bx + 20, by + 14, 8, 3);
        }
        ctx.globalAlpha = 1;
        this.drawHealthBar(ctx);
    }
}

// ---- TANK ALIEN ----
export class TankAlien extends Enemy {
    constructor(x, y) {
        super(x, y, { w: 40, h: 50, speed: 60, hp: 80, damage: 15, type: 'tank', color: COLORS.NEON_ORANGE, attackRate: 1.5, score: 250 });
    }
    draw(ctx) {
        const bx = this.x, by = this.y;
        ctx.globalAlpha = this.state === 'hurt' ? 0.5 : 1;
        const headScale = this.bigHead ? 1.6 : 1;
        ctx.fillStyle = '#3a1a0a'; ctx.fillRect(bx + 4, by + 14, 32, 26);
        ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color; ctx.fillRect(bx + 2, by + 16, 36, 22);
        ctx.fillStyle = '#cc4400';
        ctx.fillRect(bx + 6, by + 18, 8, 8); ctx.fillRect(bx + 26, by + 18, 8, 8); ctx.fillRect(bx + 14, by + 16, 12, 4);
        // Head
        ctx.save();
        if (this.bigHead) { ctx.translate(bx + 20, by + 8); ctx.scale(headScale, headScale); ctx.translate(-(bx + 20), -(by + 8)); }
        ctx.fillStyle = '#4a2a0a'; ctx.fillRect(bx + 10, by + 2, 20, 14);
        ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color; ctx.fillRect(bx + 12, by + 4, 16, 10);
        ctx.fillStyle = COLORS.NEON_YELLOW; ctx.shadowColor = COLORS.NEON_YELLOW; ctx.shadowBlur = 6;
        ctx.fillRect(bx + 14, by + 6, 5, 4); ctx.fillRect(bx + 22, by + 6, 5, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#cc4400';
        ctx.beginPath(); ctx.moveTo(bx + 10, by + 4); ctx.lineTo(bx + 6, by - 4); ctx.lineTo(bx + 14, by + 4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + 26, by + 4); ctx.lineTo(bx + 34, by - 4); ctx.lineTo(bx + 30, by + 4); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#3a1a0a'; ctx.fillRect(bx + 6, by + 38, 8, 12); ctx.fillRect(bx + 26, by + 38, 8, 12);
        if (this.state === 'attack') {
            ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color;
            ctx.fillRect(bx - 6, by + 18, 10, 10); ctx.fillRect(bx + 36, by + 18, 10, 10);
        }
        ctx.globalAlpha = 1;
        this.drawHealthBar(ctx);
    }
}

// ---- FLYING ALIEN ----
export class FlyingAlien extends Enemy {
    constructor(x, y) {
        super(x, y, { w: 28, h: 28, speed: 100, hp: 40, damage: 8, type: 'flying', color: COLORS.NEON_PURPLE, attackRate: 1.2, flying: true, score: 200 });
        this.wingAnim = 0;
        this.diveTimer = 0; this.isDiving = false;
    }
    update(dt, player, platforms, worldW, worldH) {
        this.wingAnim += dt * 10 * this.slowMoFactor;
        // Dive attack: swoop down at player periodically
        this.diveTimer -= dt * this.slowMoFactor;
        if (this.diveTimer <= 0 && !this.isDiving && this.state !== 'hurt') {
            const dist = distance(this.x, this.y, player.x, player.y);
            if (dist < 250 && !player.invisible) { this.isDiving = true; }
            this.diveTimer = 4;
        }
        if (this.isDiving && this.state !== 'hurt') {
            this.vy = 200 * this.slowMoFactor;
            if (this.y > player.y + 20 || this.y > WORLD.GROUND_Y - 120) { this.isDiving = false; this.vy = -150; }
        }
        return super.update(dt, player, platforms, worldW, worldH);
    }
    draw(ctx) {
        const bx = this.x, by = this.y;
        ctx.globalAlpha = this.state === 'hurt' ? 0.5 : 1;
        const ws = Math.sin(this.wingAnim) * 6;
        ctx.fillStyle = 'rgba(184,41,255,0.4)';
        ctx.beginPath(); ctx.moveTo(bx + 14, by + 8); ctx.lineTo(bx - 8, by - 4 + ws); ctx.lineTo(bx + 4, by + 14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + 14, by + 8); ctx.lineTo(bx + 36, by - 4 - ws); ctx.lineTo(bx + 24, by + 14); ctx.fill();
        ctx.fillStyle = '#2a0a4a';
        ctx.beginPath(); ctx.ellipse(bx + 14, by + 14, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.isGolden ? COLORS.GOLD : this.color;
        ctx.beginPath(); ctx.ellipse(bx + 14, by + 14, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.NEON_BLUE; ctx.shadowColor = COLORS.NEON_BLUE; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(bx + 14, by + 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + 14, by + 11, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = this.isGolden ? COLORS.GOLD : this.color; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const tx = bx + 8 + i * 6;
            ctx.beginPath(); ctx.moveTo(tx, by + 22);
            ctx.quadraticCurveTo(tx + Math.sin(this.wingAnim + i) * 4, by + 30, tx, by + 34); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        this.drawHealthBar(ctx);
    }
}

// ---- BOSS ALIEN ----
export class BossAlien extends Enemy {
    constructor(x, y, wave) {
        const hpMult = 1 + (wave - 1) * 0.3;
        super(x, y, { w: 60, h: 70, speed: 50, hp: Math.floor(200 * hpMult), damage: 20, type: 'boss', color: COLORS.NEON_PINK, attackRate: 2, score: 1000 });
        this.phase = 0; this.phaseTimer = 0;
        this.blastCooldown = 0;
        this.bossWave = wave;
        // Boss phases: melee → ranged → AOE
        this.attackPattern = 0;
    }
    update(dt, player, platforms, worldW, worldH) {
        super.update(dt, player, platforms, worldW, worldH);
        this.phaseTimer += dt * this.slowMoFactor;
        // Phase transitions based on HP
        const hpPct = this.hp / this.maxHp;
        if (hpPct < 0.3) this.attackPattern = 2;
        else if (hpPct < 0.6) this.attackPattern = 1;
        else this.attackPattern = 0;
        // Boss ranged attack
        this.blastCooldown -= dt * this.slowMoFactor;
        if (this.blastCooldown <= 0 && this.state !== 'hurt' && !player.invisible) {
            this.blastCooldown = this.attackPattern === 2 ? 0.8 : 1.5;
            const dx = player.x - this.x;
            return { shoot: true, dir: Math.sign(dx) };
        }
        return null;
    }
    draw(ctx) {
        const bx = this.x, by = this.y;
        ctx.globalAlpha = this.state === 'hurt' ? 0.5 : 1;
        // Aura
        const as = 40 + Math.sin(this.phaseTimer * 3) * 5;
        ctx.fillStyle = 'rgba(255,45,149,0.1)';
        ctx.beginPath(); ctx.ellipse(bx + 30, by + 35, as, as, 0, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = '#2a0020'; ctx.fillRect(bx + 8, by + 18, 44, 36);
        ctx.fillStyle = COLORS.NEON_PINK; ctx.fillRect(bx + 6, by + 20, 48, 32);
        ctx.fillStyle = '#cc0055';
        ctx.fillRect(bx + 12, by + 24, 14, 10); ctx.fillRect(bx + 34, by + 24, 14, 10);
        // Core
        ctx.fillStyle = COLORS.NEON_PURPLE; ctx.shadowColor = COLORS.NEON_PURPLE; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(bx + 30, by + 34, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        // Head
        ctx.fillStyle = '#3a0030'; ctx.fillRect(bx + 14, by + 2, 32, 18);
        ctx.fillStyle = this.color; ctx.fillRect(bx + 16, by + 4, 28, 14);
        // Crown
        ctx.fillStyle = COLORS.NEON_YELLOW;
        for (let i = 0; i < 5; i++) {
            const hx = bx + 16 + i * 7;
            ctx.beginPath(); ctx.moveTo(hx, by + 4); ctx.lineTo(hx + 3, by - 6); ctx.lineTo(hx + 6, by + 4); ctx.fill();
        }
        // Eyes
        ctx.fillStyle = COLORS.NEON_YELLOW; ctx.shadowColor = COLORS.NEON_YELLOW; ctx.shadowBlur = 8;
        ctx.fillRect(bx + 20, by + 8, 4, 4); ctx.fillRect(bx + 26, by + 6, 4, 4);
        ctx.fillRect(bx + 32, by + 6, 4, 4); ctx.fillRect(bx + 38, by + 8, 4, 4); ctx.shadowBlur = 0;
        // Arms
        ctx.fillStyle = '#3a0030';
        ctx.fillRect(bx - 2, by + 22, 10, 14); ctx.fillRect(bx + 52, by + 22, 10, 14);
        if (this.state === 'attack') {
            ctx.fillStyle = this.color;
            ctx.fillRect(bx - 10, by + 22, 14, 8); ctx.fillRect(bx + 56, by + 22, 14, 8);
        }
        // Legs
        ctx.fillStyle = '#2a0020'; ctx.fillRect(bx + 12, by + 52, 10, 18); ctx.fillRect(bx + 38, by + 52, 10, 18);
        ctx.globalAlpha = 1;
        // Health bar
        const pct = this.hp / this.maxHp;
        const bw = 56, bhh = 6;
        const hbx = bx + this.w / 2 - bw / 2, hby = by - 14;
        ctx.fillStyle = '#111'; ctx.fillRect(hbx, hby, bw, bhh);
        ctx.fillStyle = pct > 0.5 ? COLORS.NEON_PINK : COLORS.NEON_YELLOW;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
        ctx.fillRect(hbx, hby, bw * pct, bhh); ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.NEON_PINK; ctx.font = '8px "Share Tech Mono"'; ctx.textAlign = 'center';
        ctx.fillText('OVERLORD', bx + 30, hby - 4);
    }
}

// ---- SECRET BOSS ----
export class SecretBoss extends Enemy {
    constructor(x, y) {
        super(x, y, { w: 50, h: 60, speed: 70, hp: 400, damage: 25, type: 'secretboss', color: '#ff00ff', attackRate: 1.5, score: 3000 });
        this.phaseTimer = 0; this.blastCooldown = 0;
    }
    update(dt, player, platforms, worldW, worldH) {
        super.update(dt, player, platforms, worldW, worldH);
        this.phaseTimer += dt * this.slowMoFactor;
        this.blastCooldown -= dt * this.slowMoFactor;
        if (this.blastCooldown <= 0 && this.state !== 'hurt' && !player.invisible) {
            this.blastCooldown = 1.0;
            return { shoot: true, dir: Math.sign(player.x - this.x) };
        }
        return null;
    }
    draw(ctx) {
        const bx = this.x, by = this.y;
        ctx.globalAlpha = this.state === 'hurt' ? 0.5 : 1;
        // Glowing aura
        const as = 35 + Math.sin(this.phaseTimer * 4) * 6;
        ctx.fillStyle = 'rgba(255,0,255,0.12)';
        ctx.beginPath(); ctx.ellipse(bx + 25, by + 30, as, as, 0, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = '#200030'; ctx.fillRect(bx + 6, by + 16, 38, 30);
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(bx + 8, by + 18, 34, 26);
        // Head with crown
        ctx.fillStyle = '#300040'; ctx.fillRect(bx + 12, by + 2, 26, 16);
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(bx + 14, by + 4, 22, 12);
        // 6 eyes
        ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 6;
        for (let i = 0; i < 6; i++) { ctx.fillRect(bx + 15 + i * 4, by + 7, 2, 3); }
        ctx.shadowBlur = 0;
        // Legs
        ctx.fillStyle = '#200030'; ctx.fillRect(bx + 12, by + 46, 8, 14); ctx.fillRect(bx + 30, by + 46, 8, 14);
        ctx.globalAlpha = 1;
        // HP bar
        const pct = this.hp / this.maxHp;
        const bw2 = 50, bhh2 = 6, hbx2 = bx + this.w / 2 - bw2 / 2, hby2 = by - 16;
        ctx.fillStyle = '#111'; ctx.fillRect(hbx2, hby2, bw2, bhh2);
        ctx.fillStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 6;
        ctx.fillRect(hbx2, hby2, bw2 * pct, bhh2); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff00ff'; ctx.font = '8px "Share Tech Mono"'; ctx.textAlign = 'center';
        ctx.fillText('??? VOID KING ???', bx + 25, hby2 - 4);
    }
}
