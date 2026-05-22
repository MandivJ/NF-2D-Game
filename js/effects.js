// ============================================
// NEON FURY — Visual Effects System
// ============================================

import { COLORS } from './utils.js';

export class EffectsManager {
    constructor() {
        this.flashAlpha = 0;
        this.flashColor = '#fff';
        this.flashDur = 0;
        this.motionBlur = 0;
        this.trails = [];
        this.maxTrails = 30;
        this.shockwaves = [];
        this.floatingTexts = [];
        this.dayNightPhase = 0;
        this.dayNightSpeed = 0.003;
        this.ambientParticles = [];
        this._initAmbient();
    }

    _initAmbient() {
        for (let i = 0; i < 40; i++) {
            this.ambientParticles.push({
                x: Math.random() * 2400, y: Math.random() * 700,
                size: Math.random() * 2 + 1, speed: Math.random() * 20 + 5,
                angle: Math.random() * Math.PI * 2, brightness: Math.random(),
                color: Math.random() > 0.5 ? COLORS.NEON_BLUE : COLORS.NEON_PURPLE,
            });
        }
    }

    flash(color = '#fff', dur = 0.15, intensity = 0.4) {
        this.flashColor = color; this.flashAlpha = intensity; this.flashDur = dur;
    }

    addTrail(x, y, color = COLORS.NEON_BLUE) {
        this.trails.push({ x, y, life: 0.4, maxLife: 0.4, color });
        if (this.trails.length > this.maxTrails) this.trails.shift();
    }

    addShockwave(x, y, maxRadius = 80, color = COLORS.NEON_BLUE) {
        this.shockwaves.push({ x, y, radius: 0, maxRadius, color, life: 0.5, maxLife: 0.5 });
    }

    addFloatingText(text, x, y, color = COLORS.NEON_YELLOW, size = 14) {
        this.floatingTexts.push({ text, x, y, vy: -60, life: 1.0, maxLife: 1.0, color, size });
    }

    update(dt) {
        if (this.flashAlpha > 0) { this.flashDur -= dt; if (this.flashDur <= 0) { this.flashAlpha -= dt * 4; if (this.flashAlpha < 0) this.flashAlpha = 0; } }
        if (this.motionBlur > 0) { this.motionBlur -= dt * 2; if (this.motionBlur < 0) this.motionBlur = 0; }
        for (const t of this.trails) t.life -= dt;
        this.trails = this.trails.filter(t => t.life > 0);
        for (const sw of this.shockwaves) { sw.life -= dt; sw.radius = sw.maxRadius * (1 - sw.life / sw.maxLife); }
        this.shockwaves = this.shockwaves.filter(sw => sw.life > 0);
        for (const ft of this.floatingTexts) { ft.y += ft.vy * dt; ft.life -= dt; }
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
        this.dayNightPhase = (this.dayNightPhase + this.dayNightSpeed * dt) % 1;
        for (const ap of this.ambientParticles) {
            ap.x += Math.cos(ap.angle) * ap.speed * dt; ap.y += Math.sin(ap.angle) * ap.speed * dt;
            if (ap.x < 0) ap.x += 2400; if (ap.x > 2400) ap.x -= 2400;
            if (ap.y < 0) ap.y += 700; if (ap.y > 700) ap.y -= 700;
        }
    }

    drawAmbient(ctx) {
        for (const ap of this.ambientParticles) {
            const f = 0.3 + Math.sin(Date.now() * 0.002 + ap.brightness * 10) * 0.2;
            ctx.globalAlpha = f; ctx.fillStyle = ap.color;
            ctx.beginPath(); ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawTrails(ctx) {
        for (const t of this.trails) {
            ctx.globalAlpha = (t.life / t.maxLife) * 0.5; ctx.fillStyle = t.color;
            ctx.shadowColor = t.color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(t.x, t.y, 4 * (t.life / t.maxLife), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    drawShockwaves(ctx) {
        for (const sw of this.shockwaves) {
            ctx.globalAlpha = (sw.life / sw.maxLife) * 0.6; ctx.strokeStyle = sw.color;
            ctx.shadowColor = sw.color; ctx.shadowBlur = 10; ctx.lineWidth = 3 * (sw.life / sw.maxLife);
            ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    drawFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            ctx.globalAlpha = ft.life / ft.maxLife; ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color; ctx.shadowBlur = 6;
            ctx.font = `bold ${ft.size}px "Orbitron", sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    drawFlash(ctx, W, H) {
        if (this.flashAlpha > 0) { ctx.globalAlpha = this.flashAlpha; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }

    getDayNightColors() {
        const p = this.dayNightPhase;
        if (p < 0.25) { const t = p / 0.25; return { top: this._lc('#050510','#0a0a2e',t), mid: this._lc('#0a0a2e','#1a1040',t), bottom: this._lc('#1a0a3e','#2a1050',t) }; }
        if (p < 0.5) { const t = (p-0.25)/0.25; return { top: this._lc('#0a0a2e','#0f0f30',t), mid: this._lc('#1a1040','#151545',t), bottom: this._lc('#2a1050','#201060',t) }; }
        if (p < 0.75) { const t = (p-0.5)/0.25; return { top: this._lc('#0f0f30','#150a20',t), mid: this._lc('#151545','#1a0a30',t), bottom: this._lc('#201060','#250a40',t) }; }
        const t = (p-0.75)/0.25; return { top: this._lc('#150a20','#050510',t), mid: this._lc('#1a0a30','#0a0a2e',t), bottom: this._lc('#250a40','#1a0a3e',t) };
    }

    _lc(c1, c2, t) {
        const r1=parseInt(c1.slice(1,3),16), g1=parseInt(c1.slice(3,5),16), b1=parseInt(c1.slice(5,7),16);
        const r2=parseInt(c2.slice(1,3),16), g2=parseInt(c2.slice(3,5),16), b2=parseInt(c2.slice(5,7),16);
        return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
    }
}
