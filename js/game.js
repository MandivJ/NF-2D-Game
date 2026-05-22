// ============================================
// NEON FURY — Main Game Controller (Part 1)
// Entry point, game loop, world management
// ============================================
import { WORLD, COLORS, ParticleSystem, Camera, Platform, Projectile, PowerUp, Meteor, clamp, randRange } from './utils.js';
import { SoundManager } from './audio.js';
import { EffectsManager } from './effects.js';
import { SaveManager } from './save.js';
import { Player } from './player.js';
import { FastAlien, TankAlien, FlyingAlien, BossAlien } from './enemy.js';
import { CheatSystem } from './cheats.js';
import { UIManager } from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundManager();
        this.particles = new ParticleSystem();
        this.effects = new EffectsManager();
        this.save = new SaveManager();
        this.cheats = new CheatSystem();
        this.ui = new UIManager();
        this.worldW = WORLD.W; this.worldH = WORLD.H;
        this.state = 'intro';
        this.score = 0; this.wave = 0; this.kills = 0;
        this.difficulty = 1;
        this.waveSpawning = false;
        this.player = null;
        this.enemies = []; this.projectiles = []; this.powerUps = [];
        this.platforms = []; this.stars = []; this.meteors = [];
        this.camera = null;
        this.keys = {};
        this.lastTime = 0;
        // Generate stars
        for (let i = 0; i < 150; i++) {
            this.stars.push({ x: Math.random()*this.worldW, y: Math.random()*this.worldH*0.7, size: Math.random()*2+0.5, speed: Math.random()*0.3+0.1, brightness: Math.random() });
        }
        this._setupInput();
        this._setupButtons();
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        this._playIntro();
    }

    _resizeCanvas() {
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight;
        const mc = this.ui.el.menuBgCanvas;
        if (mc) { mc.width = window.innerWidth; mc.height = window.innerHeight; }
        if (this.camera) { this.camera.w = this.canvas.width; this.camera.h = this.canvas.height; }
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            // Developer console toggle
            if (e.key === '`' || e.key === '~') { e.preventDefault(); this.ui.toggleConsole(); return; }
            // Console input handling
            if (this.ui.consoleOpen) {
                if (key === 'enter' && this.ui.el.devInput) {
                    const cmd = this.ui.el.devInput.value;
                    this.ui.processCommand(cmd, this);
                    this.ui.el.devInput.value = '';
                }
                return; // Don't process game keys when console is open
            }
            if (key === 'escape') this._togglePause();
            // Skill tree toggle (U key)
            if (key === 'u' && this.state === 'playing') {
                this.ui.toggleSkillPanel();
                this.ui.updateSkillPanel(this.save);
            }
            // Teleport (E key)
            if (key === 'e' && this.state === 'playing' && this.player) this.player.teleport(this);
            // Time freeze (Q key)
            if (key === 'q' && this.state === 'playing' && this.player) this.player.activateTimeFreeze(this);
            // Combat
            if (this.state === 'playing' && this.player) {
                if (key === 'j') this.player.attack('punch', this);
                if (key === 'k') this.player.attack('kick', this);
                if (key === 'l') this.player.attack('blast', this);
            }
            // Cheat code detection
            if (this.state === 'playing') this.cheats.handleKey(key, this);
            e.preventDefault();
        });
        window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
        // Mobile controls
        document.querySelectorAll('[data-dir]').forEach(btn => {
            const keyMap = { up:'w', down:'s', left:'a', right:'d' };
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[keyMap[btn.dataset.dir]] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[keyMap[btn.dataset.dir]] = false; });
        });
        document.querySelectorAll('[data-action]').forEach(btn => {
            const a = btn.dataset.action;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (a === 'jump') this.keys[' '] = true;
                if (a === 'punch' && this.player) this.player.attack('punch', this);
                if (a === 'kick' && this.player) this.player.attack('kick', this);
                if (a === 'blast' && this.player) this.player.attack('blast', this);
            });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); if (a === 'jump') this.keys[' '] = false; });
        });
    }

    _setupButtons() {
        const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        on('btn-start', () => this._startGame());
        on('btn-controls', () => document.getElementById('controls-panel')?.classList.toggle('hidden'));
        on('btn-resume', () => this._togglePause());
        on('btn-restart-pause', () => { this._togglePause(); this._startGame(); });
        on('btn-quit', () => { this._togglePause(); this._showMenu(); });
        on('btn-retry', () => this._startGame());
        on('btn-menu', () => this._showMenu());
        on('btn-pause', () => this._togglePause());
        // Skill tree buy buttons (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.dataset.upgrade) {
                const stat = e.target.dataset.upgrade;
                if (this.save.purchaseUpgrade(stat)) {
                    this.sound.play('upgrade');
                    this.ui.updateSkillPanel(this.save);
                }
            }
        });
    }

    _playIntro() {
        const bar = document.getElementById('intro-progress');
        const status = document.getElementById('intro-status');
        const msgs = ['LOADING NEURAL NETWORK...','CALIBRATING WEAPONS...','SCANNING ALIEN SIGNALS...','ARENA READY'];
        let progress = 0;
        const iv = setInterval(() => {
            progress += 2; bar.style.width = progress + '%';
            status.textContent = msgs[Math.min(Math.floor(progress/25), msgs.length-1)];
            if (progress >= 100) {
                clearInterval(iv);
                setTimeout(() => {
                    this.ui.el.introScreen.style.opacity = '0';
                    this.ui.el.introScreen.style.transition = 'opacity 0.8s';
                    setTimeout(() => { this.ui.el.introScreen.classList.add('hidden'); this._showMenu(); }, 800);
                }, 500);
            }
        }, 40);
    }

    _showMenu() {
        this.state = 'menu'; this.ui.showMenu(); this.sound.stopMusic(); this._animateMenuBg();
    }

    _animateMenuBg() {
        if (this.state !== 'menu') return;
        const c = this.ui.el.menuBgCanvas; if (!c) return;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#050510'; ctx.fillRect(0,0,c.width,c.height);
        const time = Date.now() * 0.001;
        for (const s of this.stars) {
            const sx = (s.x*0.3)%c.width, sy = (s.y*0.5)%c.height;
            const b = 0.3+Math.sin(time*s.speed+s.brightness*10)*0.3;
            ctx.fillStyle = `rgba(0,240,255,${b})`; ctx.fillRect(sx<0?sx+c.width:sx, sy<0?sy+c.height:sy, s.size, s.size);
        }
        ctx.strokeStyle = 'rgba(0,240,255,0.08)'; ctx.lineWidth = 1;
        const gy = c.height*0.7;
        for (let gx=0; gx<c.width; gx+=40) { ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx,c.height); ctx.stroke(); }
        for (let g=gy; g<c.height; g+=30) { ctx.beginPath(); ctx.moveTo(0,g); ctx.lineTo(c.width,g); ctx.stroke(); }
        requestAnimationFrame(() => this._animateMenuBg());
    }

    _startGame() {
        this.state = 'playing';
        this.score = 0; this.wave = 0; this.kills = 0; this.difficulty = 1;
        this.waveSpawning = false;
        this.enemies = []; this.projectiles = []; this.powerUps = []; this.meteors = [];
        this.player = new Player(200, WORLD.GROUND_Y - 80, this.save);
        this.player.invincible = 2.0;
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.platforms = [
            new Platform(0, WORLD.GROUND_Y, this.worldW, WORLD.GROUND_H),
            new Platform(200,400,180,16), new Platform(500,330,160,16),
            new Platform(800,380,200,16), new Platform(1100,300,150,16),
            new Platform(1400,360,180,16), new Platform(1700,280,160,16),
            new Platform(2000,340,200,16),
        ];
        this.sound.init(); this.sound.startMusic();
        this.ui.showGame(); this.ui.displayedScore = 0;
        this._nextWave();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused'; this.ui.showPause(true); this.sound.stopMusic();
        } else if (this.state === 'paused') {
            this.state = 'playing'; this.ui.showPause(false);
            this.sound.init(); this.sound.startMusic();
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this._gameLoop(t));
        }
    }

    _nextWave() {
        if (this.waveSpawning) return;
        this.waveSpawning = true; this.wave++; this.difficulty = 1 + (this.wave-1)*0.15;
        const isBoss = this.wave % 5 === 0;
        const count = Math.min(3+this.wave, 12);
        this.ui.showWaveAnnouncement(this.wave, isBoss, count);
        this.sound.play(isBoss ? 'boss' : 'wave');
        // Unlock abilities at milestones
        if (this.wave >= 3 && !this.save.hasAbility('doubleJump')) {
            this.save.unlockAbility('doubleJump'); this.player.canDoubleJump = true;
        }
        if (this.wave >= 5 && !this.save.hasAbility('teleport')) {
            this.save.unlockAbility('teleport'); this.player.canTeleport = true;
        }
        if (this.wave >= 8 && !this.save.hasAbility('rageMode')) {
            this.save.unlockAbility('rageMode'); this.player.canRage = true;
        }
        if (this.wave >= 10 && !this.save.hasAbility('drone')) {
            this.save.unlockAbility('drone'); this.player.hasDrone = true;
        }
        setTimeout(() => this._spawnWave(isBoss), 1500);
    }

    _spawnWave(isBoss) {
        const newE = [];
        if (isBoss) {
            const bx = this.player.x > this.worldW/2 ? 200 : this.worldW-200;
            newE.push(new BossAlien(bx, WORLD.GROUND_Y - 70, this.wave));
            for (let i=0;i<2;i++) newE.push(new FastAlien(bx+(Math.random()-0.5)*300, WORLD.GROUND_Y - 36));
        } else {
            const count = Math.min(3+this.wave, 12);
            for (let i=0; i<count; i++) {
                const sx = this.player.x + (Math.random()>0.5?1:-1)*(400+Math.random()*400);
                const cx = clamp(sx, 50, this.worldW-50);
                const r = Math.random();
                if (r<0.5) newE.push(new FastAlien(cx, WORLD.GROUND_Y - 36));
                else if (r<0.8) newE.push(new TankAlien(cx, WORLD.GROUND_Y - 50));
                else newE.push(new FlyingAlien(cx, 100+Math.random()*200));
            }
        }
        // Scale with difficulty
        newE.forEach(e => {
            e.hp = Math.floor(e.hp*this.difficulty); e.maxHp = e.hp;
            e.speed *= (1+(this.difficulty-1)*0.5);
            // 5% chance for golden alien
            if (Math.random() < 0.05 && e.type !== 'boss') {
                e.isGolden = true; e.hp *= 2; e.maxHp = e.hp; e.scoreValue *= 3;
            }
        });
        this.cheats.applyToNewEnemies(newE);
        this.enemies.push(...newE);
        this.waveSpawning = false;
    }

    _spawnSingleEnemy() {
        const x = this.player.x + (Math.random()>0.5?1:-1)*300;
        const e = new FastAlien(clamp(x,50,this.worldW-50), WORLD.GROUND_Y - 36);
        this.cheats.applyToNewEnemies([e]);
        this.enemies.push(e);
    }

    _gameLoop(timestamp) {
        if (this.state !== 'playing') return;
        const dt = Math.min((timestamp - this.lastTime)/1000, 0.05);
        this.lastTime = timestamp;
        this._update(dt); this._render();
        this.ui.updateFps(dt);
        requestAnimationFrame((t) => this._gameLoop(t));
    }

    _update(dt) {
        const p = this.player;
        p.update(dt, this.keys, this.platforms, this.worldW, this.worldH);
        this.camera.follow(p, this.worldW, this.worldH, dt);
        // Energy trails when moving fast
        if (Math.abs(p.vx) > 100 || Math.abs(p.vy) > 100) {
            this.effects.addTrail(p.x+p.w/2, p.y+p.h/2, p.rageMode ? COLORS.NEON_ORANGE : COLORS.NEON_BLUE);
        }
        // Time freeze factor
        const eDt = p.timeFreezeActive ? dt * 0.1 : dt;
        // Update enemies
        for (const e of this.enemies) {
            const result = e.update(eDt, p, this.platforms, this.worldW, this.worldH);
            if (result && result.shoot) {
                const proj = new Projectile(e.x+(result.dir>0?e.w:0), e.y+e.h/2, result.dir, 'enemy');
                proj.damage = 15; this.projectiles.push(proj);
            }
            if (e.isAttacking(p)) {
                const kd = p.x < e.x ? -1 : 1;
                p.takeDamage(e.damage, kd);
                this.sound.play('hit'); this.camera.shake(6, 0.2);
                this.particles.emit(p.x+p.w/2, p.y+p.h/2, 8, COLORS.NEON_PINK, {speed:120});
                this.effects.flash(COLORS.NEON_PINK, 0.1, 0.15);
                this.ui.triggerHudGlitch();
            }
        }
        // Player attack hits
        if (p.attackBox) {
            const ab = p.attackBox;
            for (const e of this.enemies) {
                if (e.alive && ab.x<e.x+e.w && ab.x+ab.w>e.x && ab.y<e.y+e.h && ab.y+ab.h>e.y) {
                    e.takeDamage(ab.damage, e.x<p.x?-1:1);
                    this.sound.play('hit'); p.addCombo();
                    this.score += Math.floor(10*p.combo); this.camera.shake(4, 0.15);
                    this.particles.emit(e.x+e.w/2, e.y+e.h/2, 8, e.isGolden?COLORS.GOLD:e.color, {speed:100});
                    this.effects.addFloatingText(`+${Math.floor(10*p.combo)}`, e.x+e.w/2, e.y-10, COLORS.NEON_YELLOW, 12);
                    if (p.combo >= 3) { this.ui.showCombo(p.combo); this.sound.play('combo'); }
                }
            }
            p.attackBox = null;
        }
        // Projectiles
        for (const proj of this.projectiles) {
            proj.update(eDt);
            if (proj.owner === 'player') {
                for (const e of this.enemies) {
                    if (e.alive && proj.alive && proj.x>e.x && proj.x<e.x+e.w && proj.y>e.y && proj.y<e.y+e.h) {
                        e.takeDamage(proj.damage, Math.sign(proj.dir));
                        proj.alive = false; p.addCombo();
                        this.score += Math.floor(15*p.combo);
                        this.particles.emit(proj.x, proj.y, 12, COLORS.NEON_PURPLE, {speed:150});
                        this.effects.addShockwave(proj.x, proj.y, 40, COLORS.NEON_PURPLE);
                        this.sound.play('explosion'); this.camera.shake(5, 0.2);
                    }
                }
            }
            if (proj.owner === 'enemy' && proj.alive) {
                if (proj.x>p.x && proj.x<p.x+p.w && proj.y>p.y && proj.y<p.y+p.h) {
                    p.takeDamage(proj.damage, Math.sign(proj.dir));
                    proj.alive = false; this.sound.play('hit'); this.camera.shake(8, 0.3);
                    this.particles.emit(p.x+p.w/2, p.y+p.h/2, 10, COLORS.NEON_PINK);
                }
            }
        }
        this.projectiles = this.projectiles.filter(pr => pr.alive);
        // Dead enemies
        for (const e of this.enemies) {
            if (!e.alive) {
                this.kills++; this.score += e.scoreValue;
                this.sound.play('explosion');
                this.particles.emit(e.x+e.w/2, e.y+e.h/2, 20, e.isGolden?COLORS.GOLD:e.color, {speed:200, spread:20});
                this.effects.addShockwave(e.x+e.w/2, e.y+e.h/2, e.type==='boss'?80:40, e.color);
                this.camera.shake(e.type==='boss'?12:6, e.type==='boss'?0.5:0.3);
                this.effects.addFloatingText(`+${e.scoreValue}`, e.x+e.w/2, e.y-20, e.isGolden?COLORS.GOLD:COLORS.NEON_YELLOW, 14);
                // Drop power-up
                if (Math.random() < (e.isGolden ? 1 : 0.3)) {
                    const types = ['health','speed','shield'];
                    this.powerUps.push(new PowerUp(e.x+e.w/2, e.y, types[Math.floor(Math.random()*3)]));
                }
            }
        }
        this.enemies = this.enemies.filter(e => e.alive);
        // Power-up collection
        for (const pu of this.powerUps) {
            pu.update(dt);
            if (!pu.alive) continue;
            const dx = p.x+p.w/2-pu.x, dy = p.y+p.h/2-pu.y;
            if (Math.sqrt(dx*dx+dy*dy) < 30) {
                pu.alive = false; this.sound.play('powerup');
                this.particles.emit(pu.x, pu.y, 15, pu.type==='health'?COLORS.NEON_GREEN:pu.type==='coin'?COLORS.GOLD:COLORS.NEON_BLUE, {speed:80, upward:100});
                if (pu.type==='health') p.hp = Math.min(p.maxHp, p.hp+30);
                if (pu.type==='speed') { p.speedBoost=true; p.speedTimer=8; }
                if (pu.type==='shield') { p.shieldActive=true; p.shieldTimer=6; this.sound.play('shield'); }
                if (pu.type==='coin') { this.score+=200; this.effects.addFloatingText('+200', pu.x, pu.y-10, COLORS.GOLD); }
                if (pu.type==='weapon') { this.score+=100; p.damageMultiplier*=1.1; this.effects.addFloatingText('DMG UP!', pu.x, pu.y-10, COLORS.NEON_ORANGE); }
            }
        }
        this.powerUps = this.powerUps.filter(pu => pu.alive);
        // Meteors
        for (const m of this.meteors) {
            m.update(dt);
            if (!m.alive) {
                this.particles.emit(m.x, WORLD.GROUND_Y - 10, 15, COLORS.NEON_ORANGE, {speed:180, spread:20});
                this.effects.addShockwave(m.x, WORLD.GROUND_Y - 10, 60, COLORS.NEON_ORANGE);
                this.camera.shake(8, 0.3); this.sound.play('explosion');
                // Damage nearby enemies
                for (const e of this.enemies) {
                    if (Math.abs(e.x-m.x)<60) e.takeDamage(30, Math.sign(e.x-m.x));
                }
                // Damage player if close
                if (Math.abs(p.x-m.x)<40) p.takeDamage(15, Math.sign(p.x-m.x));
            }
        }
        this.meteors = this.meteors.filter(m => m.alive);
        // Drone shooting
        if (p.hasDrone) p.droneShoot(this.enemies, this.projectiles);
        // Particles & effects
        this.particles.update(dt);
        this.effects.update(dt);
        this.cheats.updateSecrets(dt, this);
        // Wave completion
        if (this.enemies.length === 0 && !this.waveSpawning) this._nextWave();
        // Game over
        if (p.hp <= 0) this._gameOver();
        // HUD
        this.ui.updateHUD(p, this.score, this.wave, this.enemies);
    }

    _gameOver() {
        this.state = 'gameover'; this.sound.stopMusic(); this.sound.play('death');
        const isNew = this.save.updateHighScore(this.score, this.wave, this.kills);
        this.ui.showGameOver(this.score, this.wave, this.kills, this.player.maxCombo, this.save.data.highScore);
        this.save.save();
    }

    _render() {
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        ctx.fillStyle = '#050510'; ctx.fillRect(0,0,W,H);
        ctx.save();
        // Background with day/night
        const dnc = this.effects.getDayNightColors();
        const bgG = ctx.createLinearGradient(0,0,0,H);
        bgG.addColorStop(0, dnc.top); bgG.addColorStop(0.5, dnc.mid); bgG.addColorStop(1, dnc.bottom);
        ctx.fillStyle = bgG; ctx.fillRect(0,0,W,H);
        // Stars
        for (const s of this.stars) {
            const px = (s.x-this.camera.x*s.speed*0.5)%W;
            const py = (s.y-this.camera.y*s.speed*0.3)%(H*0.7);
            const f = 0.4+Math.sin(Date.now()*0.003*s.speed+s.brightness*20)*0.3;
            ctx.fillStyle = `rgba(0,240,255,${f})`;
            ctx.fillRect(px<0?px+W:px, py<0?py+H*0.7:py, s.size, s.size);
        }
        // Mountains
        ctx.fillStyle = dnc.mid; ctx.beginPath(); ctx.moveTo(0, H*0.65);
        for (let mx=0; mx<W; mx+=60) {
            const mh = Math.sin((mx+this.camera.x*0.1)*0.01)*40+Math.sin((mx+this.camera.x*0.1)*0.025)*20;
            ctx.lineTo(mx, H*0.55+mh);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
        // Horizon
        ctx.strokeStyle = 'rgba(184,41,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H*0.7); ctx.lineTo(W, H*0.7); ctx.stroke();
        // Camera transform
        ctx.save(); this.camera.applyTransform(ctx);
        // Ground
        const gY = WORLD.GROUND_Y;
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, gY, this.worldW, WORLD.GROUND_H);
        ctx.strokeStyle = 'rgba(0,240,255,0.15)'; ctx.lineWidth = 1;
        for (let gx=0; gx<this.worldW; gx+=40) { ctx.beginPath(); ctx.moveTo(gx,gY); ctx.lineTo(gx,gY+WORLD.GROUND_H); ctx.stroke(); }
        ctx.strokeStyle = COLORS.NEON_BLUE; ctx.shadowColor = COLORS.NEON_BLUE; ctx.shadowBlur = 8; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0,gY); ctx.lineTo(this.worldW,gY); ctx.stroke(); ctx.shadowBlur = 0;
        // Ground glow — illuminates battlefield for better visibility
        const groundGlow = ctx.createLinearGradient(0, gY - 150, 0, gY);
        groundGlow.addColorStop(0, 'rgba(0,240,255,0)');
        groundGlow.addColorStop(0.6, 'rgba(0,240,255,0.02)');
        groundGlow.addColorStop(1, 'rgba(0,240,255,0.06)');
        ctx.fillStyle = groundGlow;
        ctx.fillRect(0, gY - 150, this.worldW, 150);
        // Platforms
        for (const pl of this.platforms) { if (pl.y < gY) pl.draw(ctx); }
        // Ambient particles
        this.effects.drawAmbient(ctx);
        // Power-ups
        for (const pu of this.powerUps) pu.draw(ctx);
        // Meteors
        for (const m of this.meteors) m.draw(ctx);
        // Trails & shockwaves
        this.effects.drawTrails(ctx);
        this.effects.drawShockwaves(ctx);
        // Entity shadows on ground
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (const e of this.enemies) {
            const eDist = Math.max(0, gY - (e.y + e.h));
            const eS = Math.max(0.3, 1 - eDist * 0.004);
            ctx.globalAlpha = 0.2 * eS;
            ctx.beginPath();
            ctx.ellipse(e.x + e.w/2, gY - 1, e.w * 0.4 * eS, 2.5 * eS, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.player) {
            const pDist = Math.max(0, gY - (this.player.y + this.player.h));
            const pS = Math.max(0.3, 1 - pDist * 0.004);
            ctx.globalAlpha = 0.3 * pS;
            ctx.beginPath();
            ctx.ellipse(this.player.x + this.player.w/2, gY - 1, this.player.w * 0.5 * pS, 3 * pS, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        // Entity glow outlines for visibility
        ctx.save();
        for (const e of this.enemies) {
            ctx.globalAlpha = 0.07;
            ctx.fillStyle = e.isGolden ? COLORS.GOLD : e.color;
            ctx.shadowColor = e.isGolden ? COLORS.GOLD : e.color;
            ctx.shadowBlur = 14;
            ctx.fillRect(e.x - 2, e.y - 1, e.w + 4, e.h + 2);
        }
        if (this.player) {
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = COLORS.NEON_BLUE;
            ctx.shadowColor = COLORS.NEON_BLUE;
            ctx.shadowBlur = 18;
            ctx.fillRect(this.player.x - 3, this.player.y - 2, this.player.w + 6, this.player.h + 4);
        }
        ctx.restore();
        // Enemies
        for (const e of this.enemies) e.draw(ctx);
        // Player
        if (this.player) this.player.draw(ctx);
        // Projectiles
        for (const proj of this.projectiles) proj.draw(ctx);
        // Particles & floating text
        this.particles.draw(ctx);
        this.effects.drawFloatingTexts(ctx);
        ctx.restore(); // camera
        // Screen flash
        this.effects.drawFlash(ctx, W, H);
        // Cheat notification
        this.cheats.drawNotification(ctx, W, H);
        // Time freeze overlay
        if (this.player && this.player.timeFreezeActive) {
            ctx.globalAlpha = 0.1; ctx.fillStyle = COLORS.NEON_BLUE; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1;
        }
        ctx.restore();
    }
}

// Initialize game
const game = new Game();
