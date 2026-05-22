// ============================================
// NEON FURY — Utility Classes & Constants
// Shared helpers used by all game modules
// ============================================

// ---- GAME CONSTANTS ----
// Central place for all magic numbers and config values
export const WORLD = {
    W: 2400,       // Total world width in pixels
    H: 1000,       // Total world height (includes below-ground buffer for camera centering)
    GRAVITY: 900,  // Gravity acceleration (pixels/s²)
    GROUND_H: 20,  // Height of the ground strip
    GROUND_Y: 580, // Y coordinate of ground surface — battlefield vertical center reference
};

// Neon color palette used throughout the game
export const COLORS = {
    NEON_BLUE: '#00f0ff',
    NEON_PURPLE: '#b829ff',
    NEON_GREEN: '#39ff14',
    NEON_PINK: '#ff2d95',
    NEON_ORANGE: '#ff6b2b',
    NEON_YELLOW: '#ffe600',
    NEON_RED: '#ff3333',
    CYBER_DARK: '#0a0a1a',
    CYBER_DARKER: '#050510',
    CYBER_PANEL: '#111133',
    CYBER_BORDER: '#1a1a4e',
    GOLD: '#ffd700',
};

// ---- AXIS-ALIGNED BOUNDING BOX (AABB) COLLISION ----
// Checks if two rectangles overlap — the foundation of all hit detection
export function aabbCollision(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

// ---- DISTANCE HELPER ----
// Euclidean distance between two points
export function distance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

// ---- CLAMP HELPER ----
// Restricts a value between min and max
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// ---- RANDOM RANGE ----
export function randRange(min, max) {
    return min + Math.random() * (max - min);
}

// ---- RANDOM INT RANGE ----
export function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

// ============================================
// PARTICLE — A single visual effect particle
// ============================================
export class Particle {
    /**
     * @param {number} x - Start X position
     * @param {number} y - Start Y position
     * @param {number} vx - Horizontal velocity
     * @param {number} vy - Vertical velocity
     * @param {string} color - CSS color string
     * @param {number} size - Radius or side length
     * @param {number} life - Duration in seconds
     * @param {string} type - 'circle' or 'square'
     */
    constructor(x, y, vx, vy, color, size, life, type = 'circle') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.type = type;
        this.alive = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 200 * dt; // Gravity pulls particles down
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(
                this.x - this.size / 2,
                this.y - this.size / 2,
                this.size,
                this.size
            );
        }
        ctx.globalAlpha = 1;
    }
}

// ============================================
// PARTICLE SYSTEM — Manages all active particles
// ============================================
export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500; // Cap to prevent performance issues
    }

    /**
     * Emit a burst of particles at a position
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} count - Number of particles
     * @param {string} color - Particle color
     * @param {Object} opts - Options: speed, spread, upward, size, life, type, gravity
     */
    emit(x, y, count, color, opts = {}) {
        // Limit total particles for performance
        const canSpawn = Math.min(count, this.maxParticles - this.particles.length);
        for (let i = 0; i < canSpawn; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (opts.speed || 150) * (0.5 + Math.random());
            const p = new Particle(
                x + (Math.random() - 0.5) * (opts.spread || 10),
                y + (Math.random() - 0.5) * (opts.spread || 10),
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - (opts.upward || 0),
                color,
                opts.size || 3 + Math.random() * 3,
                opts.life || 0.5 + Math.random() * 0.5,
                opts.type || 'circle'
            );
            // Override gravity if specified
            if (opts.noGravity) p._noGravity = true;
            this.particles.push(p);
        }
    }

    /**
     * Emit a ring-shaped shockwave of particles
     */
    emitRing(x, y, count, color, radius, opts = {}) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = opts.speed || 200;
            const p = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                opts.size || 2,
                opts.life || 0.4,
                'circle'
            );
            p._noGravity = true;
            this.particles.push(p);
        }
    }

    update(dt) {
        for (const p of this.particles) {
            if (p._noGravity) {
                // Skip gravity for ring/trail particles
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                if (p.life <= 0) p.alive = false;
            } else {
                p.update(dt);
            }
        }
        this.particles = this.particles.filter(p => p.alive);
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }
}

// ============================================
// CAMERA — Follows the player with smooth lerp
// ============================================
export class Camera {
    constructor(w, h) {
        this.x = 0;
        this.y = 0;
        this.w = w;
        this.h = h;
        // Screen shake state
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDur = 0;
        this.shakeIntensity = 0;
    }

    /**
     * Smoothly follow a target entity
     * @param {Object} target - Entity with x, y, w, h
     * @param {number} worldW - World width
     * @param {number} worldH - World height
     * @param {number} dt - Delta time
     */
    follow(target, worldW, worldH, dt) {
        // Target camera position centers on the target
        const tx = target.x + target.w / 2 - this.w / 2;
        const ty = target.y + target.h / 2 - this.h / 2;
        // Smooth interpolation (lerp)
        this.x += (tx - this.x) * 5 * dt;
        this.y += (ty - this.y) * 5 * dt;
        // Clamp X to world bounds
        this.x = clamp(this.x, 0, Math.max(0, worldW - this.w));
        // Allow camera Y beyond world bounds for proper centering on any screen size
        const minY = Math.min(0, worldH - this.h);
        const maxY = Math.max(0, worldH - this.h);
        this.y = clamp(this.y, minY, maxY);
        // Process screen shake
        if (this.shakeDur > 0) {
            this.shakeDur -= dt;
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    /**
     * Trigger a screen shake effect
     * @param {number} intensity - Shake magnitude in pixels
     * @param {number} dur - Duration in seconds
     */
    shake(intensity, dur) {
        // Only override if new shake is stronger
        if (intensity > this.shakeIntensity || this.shakeDur <= 0) {
            this.shakeIntensity = intensity;
            this.shakeDur = dur;
        }
    }

    /**
     * Apply camera transform to the canvas context
     */
    applyTransform(ctx) {
        ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
    }
}

// ============================================
// PLATFORM — A static surface the player can stand on
// ============================================
export class Platform {
    constructor(x, y, w, h, color = '#1a1a4e') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
    }

    draw(ctx) {
        // Platform body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        // Neon top edge — gives that cyberpunk glow
        ctx.strokeStyle = COLORS.NEON_BLUE;
        ctx.shadowColor = COLORS.NEON_BLUE;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.w, this.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Grid lines for tech-floor look
        ctx.strokeStyle = 'rgba(0,240,255,0.1)';
        ctx.lineWidth = 1;
        for (let gx = this.x; gx < this.x + this.w; gx += 20) {
            ctx.beginPath();
            ctx.moveTo(gx, this.y);
            ctx.lineTo(gx, this.y + this.h);
            ctx.stroke();
        }
    }
}

// ============================================
// PROJECTILE — Energy blast shot by player or enemies
// ============================================
export class Projectile {
    constructor(x, y, dir, owner) {
        this.x = x;
        this.y = y;
        this.w = 20;
        this.h = 8;
        this.speed = 500;
        this.dir = dir;       // 1 = right, -1 = left
        this.damage = 25;
        this.alive = true;
        this.owner = owner;   // 'player' or 'enemy'
        this.life = 1.5;      // Auto-destroy after 1.5 seconds
        this.trail = [];      // Trail positions for visual effect
    }

    update(dt) {
        // Record trail position
        this.trail.push({ x: this.x, y: this.y, life: 0.2 });
        // Move projectile
        this.x += this.speed * this.dir * dt;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
        // Fade trail
        for (const t of this.trail) t.life -= dt;
        this.trail = this.trail.filter(t => t.life > 0);
    }

    draw(ctx) {
        // Draw energy trail
        for (const t of this.trail) {
            ctx.globalAlpha = (t.life / 0.2) * 0.5;
            ctx.fillStyle = COLORS.NEON_PURPLE;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Main blast glow
        ctx.shadowColor = COLORS.NEON_PURPLE;
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.NEON_PURPLE;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================
// POWERUP — Collectible item dropped by enemies
// ============================================
export class PowerUp {
    /**
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} type - 'health', 'speed', 'shield', 'coin', 'weapon'
     */
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 24;
        this.type = type;
        this.alive = true;
        this.bobOffset = Math.random() * Math.PI * 2; // Random starting phase for bobbing
        this.life = 15; // Disappears after 15 seconds
    }

    update(dt) {
        this.bobOffset += dt * 3;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }

    draw(ctx) {
        const yOff = Math.sin(this.bobOffset) * 5;
        const colors = {
            health: COLORS.NEON_GREEN,
            speed: COLORS.NEON_YELLOW,
            shield: COLORS.NEON_BLUE,
            coin: COLORS.GOLD,
            weapon: COLORS.NEON_ORANGE,
        };
        const icons = {
            health: '❤',
            speed: '⚡',
            shield: '🛡',
            coin: '💰',
            weapon: '🔫',
        };
        const col = colors[this.type] || COLORS.NEON_BLUE;

        // Glow effect
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        // Background box
        ctx.fillStyle = 'rgba(17,17,51,0.8)';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.x - 14, this.y - 14 + yOff, 28, 28, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Icon
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(icons[this.type] || '?', this.x, this.y + yOff);
    }
}

// ============================================
// METEOR — A falling environmental hazard
// ============================================
export class Meteor {
    constructor(x) {
        this.x = x;
        this.y = -50; // Start above screen
        this.w = 16;
        this.h = 16;
        this.vy = randRange(300, 500);
        this.vx = randRange(-50, 50);
        this.alive = true;
        this.rotation = 0;
        this.trail = [];
    }

    update(dt) {
        this.trail.push({ x: this.x, y: this.y, life: 0.3 });
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += dt * 5;
        // Fade trail
        for (const t of this.trail) t.life -= dt;
        this.trail = this.trail.filter(t => t.life > 0);
        // Hit ground (uses GROUND_Y constant)
        if (this.y > WORLD.GROUND_Y - 10) {
            this.alive = false;
        }
    }

    draw(ctx) {
        // Fire trail
        for (const t of this.trail) {
            const alpha = t.life / 0.3;
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = COLORS.NEON_ORANGE;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 6 * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Meteor body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = '#aa4400';
        ctx.shadowColor = COLORS.NEON_ORANGE;
        ctx.shadowBlur = 15;
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#cc6600';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
