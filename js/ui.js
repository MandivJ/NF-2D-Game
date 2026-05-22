// ============================================
// NEON FURY — UI System
// HUD, Developer Console, Skill Tree, Menus
// ============================================
import { COLORS } from './utils.js';

export class UIManager {
    constructor() {
        // Cache DOM elements
        this.el = {
            introScreen: document.getElementById('intro-screen'),
            startMenu: document.getElementById('start-menu'),
            hud: document.getElementById('game-hud'),
            pauseMenu: document.getElementById('pause-menu'),
            gameoverScreen: document.getElementById('gameover-screen'),
            playerHealthBar: document.getElementById('player-health-bar'),
            playerHpText: document.getElementById('player-hp-text'),
            waveNumber: document.getElementById('wave-number'),
            scoreDisplay: document.getElementById('score-display'),
            comboCounter: document.getElementById('combo-counter'),
            enemyCounter: document.getElementById('enemy-counter'),
            waveAnnouncement: document.getElementById('wave-announcement'),
            waveAnnounceText: document.getElementById('wave-announce-text'),
            waveAnnounceSub: document.getElementById('wave-announce-sub'),
            bossWarning: document.getElementById('boss-warning'),
            comboDisplay: document.getElementById('combo-display'),
            comboText: document.getElementById('combo-text'),
            shieldIndicator: document.getElementById('shield-indicator'),
            shieldBar: document.getElementById('shield-bar'),
            speedIndicator: document.getElementById('speed-indicator'),
            finalScore: document.getElementById('final-score'),
            finalWave: document.getElementById('final-wave'),
            finalKills: document.getElementById('final-kills'),
            finalCombo: document.getElementById('final-combo'),
            highScoreDisplay: document.getElementById('high-score-display'),
            menuBgCanvas: document.getElementById('menu-bg-canvas'),
            devConsole: document.getElementById('dev-console'),
            devInput: document.getElementById('dev-input'),
            devOutput: document.getElementById('dev-output'),
            skillPanel: document.getElementById('skill-panel'),
            fpsCounter: document.getElementById('fps-counter'),
        };
        // Developer console state
        this.consoleOpen = false;
        this.consoleHistory = [];
        // FPS counter
        this.showFps = false;
        this.fpsFrames = 0;
        this.fpsTime = 0;
        this.currentFps = 0;
        // Skill panel
        this.skillPanelOpen = false;
        // Animated score
        this.displayedScore = 0;
        // HUD glitch effect
        this.hudGlitchTimer = 0;
        // Console minimize state
        this.consoleMinimized = false;
        // Console button handlers
        const minBtn = document.getElementById('console-minimize');
        const closeBtn = document.getElementById('console-close');
        if (minBtn) minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.minimizeConsole(); });
        if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleConsole(); });
    }

    // ---- DEVELOPER CONSOLE ----

    toggleConsole() {
        this.consoleOpen = !this.consoleOpen;
        if (this.el.devConsole) {
            this.el.devConsole.classList.toggle('console-open', this.consoleOpen);
            if (this.consoleOpen) {
                this.consoleMinimized = false;
                this.el.devConsole.classList.remove('console-minimized');
                if (this.el.devInput) setTimeout(() => this.el.devInput.focus(), 100);
            }
        }
    }

    minimizeConsole() {
        this.consoleMinimized = !this.consoleMinimized;
        if (this.el.devConsole) {
            this.el.devConsole.classList.toggle('console-minimized', this.consoleMinimized);
        }
    }

    /**
     * Process a console command
     * @param {string} cmd - Command string
     * @param {Object} game - Game reference
     * @returns {string} Response message
     */
    processCommand(cmd, game) {
        const parts = cmd.trim().toLowerCase().split(/\s+/);
        const command = parts[0];
        let response = '';

        switch (command) {
            case 'spawn':
                if (parts[1] === 'alien') {
                    game._spawnSingleEnemy();
                    response = '> Spawned alien';
                } else { response = '> Usage: spawn alien'; }
                break;
            case 'heal':
                if (game.player) {
                    game.player.hp = game.player.maxHp;
                    response = '> Healed to full HP';
                }
                break;
            case 'give':
                if (parts[1] === 'shield' && game.player) {
                    game.player.shieldActive = true;
                    game.player.shieldTimer = 10;
                    response = '> Shield activated (10s)';
                } else { response = '> Usage: give shield'; }
                break;
            case 'next':
                if (parts[1] === 'wave') {
                    game.enemies.forEach(e => e.alive = false);
                    game.enemies = [];
                    game._nextWave();
                    response = '> Advancing to next wave';
                } else { response = '> Usage: next wave'; }
                break;
            case 'fps':
                if (parts[1] === 'on') { this.showFps = true; response = '> FPS counter ON'; }
                else if (parts[1] === 'off') { this.showFps = false; response = '> FPS counter OFF'; }
                else { response = '> Usage: fps on/off'; }
                break;
            case 'god':
                game.cheats.handleKey('g', game); game.cheats.handleKey('o', game);
                game.cheats.handleKey('d', game); game.cheats.handleKey('m', game);
                game.cheats.handleKey('o', game); game.cheats.handleKey('d', game);
                game.cheats.handleKey('e', game);
                response = '> God mode toggled';
                break;
            case 'kill':
                if (parts[1] === 'all') {
                    game.cheats._killAll(game);
                    response = '> Killed all enemies';
                }
                break;
            case 'set':
                if (parts[1] === 'score' && parts[2]) {
                    game.score = parseInt(parts[2]) || 0;
                    response = `> Score set to ${game.score}`;
                }
                break;
            case 'help':
                response = '> Commands: spawn alien, heal, give shield, next wave, fps on/off, god, kill all, set score <n>';
                break;
            default:
                response = `> Unknown command: ${command}. Type "help"`;
        }

        this.consoleHistory.push(response);
        if (this.consoleHistory.length > 8) this.consoleHistory.shift();
        this._updateConsoleOutput();
        return response;
    }

    _updateConsoleOutput() {
        if (this.el.devOutput) {
            this.el.devOutput.textContent = this.consoleHistory.join('\n');
            this.el.devOutput.scrollTop = this.el.devOutput.scrollHeight;
        }
    }

    // ---- SKILL TREE ----

    toggleSkillPanel() {
        this.skillPanelOpen = !this.skillPanelOpen;
        if (this.el.skillPanel) {
            this.el.skillPanel.classList.toggle('hidden', !this.skillPanelOpen);
        }
    }

    updateSkillPanel(saveManager) {
        if (!this.el.skillPanel || !saveManager) return;
        const stats = ['damage', 'health', 'speed', 'energy'];
        const icons = { damage: '⚔️', health: '❤️', speed: '⚡', energy: '🔋' };
        const colors = { damage: COLORS.NEON_PINK, health: COLORS.NEON_GREEN, speed: COLORS.NEON_YELLOW, energy: COLORS.NEON_BLUE };
        let html = `<div class="text-center mb-3">
            <p class="font-cyber text-neon-purple text-sm tracking-widest">SKILL TREE</p>
            <p class="font-mono text-neon-yellow text-xs mt-1">Points: ${saveManager.data.upgradePoints}</p>
        </div>`;
        for (const stat of stats) {
            const level = saveManager.getUpgradeLevel(stat);
            const cost = saveManager.getUpgradeCost(stat);
            const canBuy = level < 5 && saveManager.data.upgradePoints >= cost;
            const bars = Array(5).fill(0).map((_, i) => i < level ? '█' : '░').join('');
            html += `<div class="skill-row mb-2 p-2 rounded border border-cyber-border bg-cyber-panel/50">
                <div class="flex justify-between items-center">
                    <span class="font-mono text-xs" style="color:${colors[stat]}">${icons[stat]} ${stat.toUpperCase()}</span>
                    <span class="font-mono text-xs text-gray-400">${bars} Lv.${level}/5</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                    <span class="font-mono text-[10px] text-gray-500">×${saveManager.getUpgradeMultiplier(stat).toFixed(1)}</span>
                    <button data-upgrade="${stat}" class="skill-buy-btn text-[10px] font-mono px-2 py-0.5 rounded ${canBuy ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50 hover:bg-neon-purple/40 cursor-pointer' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}" ${canBuy ? '' : 'disabled'}>
                        ${level >= 5 ? 'MAX' : `${cost} pts`}
                    </button>
                </div>
            </div>`;
        }
        const content = this.el.skillPanel.querySelector('.skill-content');
        if (content) content.innerHTML = html;
    }

    // ---- HUD UPDATES ----

    updateHUD(player, score, wave, enemies) {
        if (!player) return;
        // Animated score counter
        if (this.displayedScore < score) {
            this.displayedScore += Math.ceil((score - this.displayedScore) * 0.1);
            if (this.displayedScore > score) this.displayedScore = score;
        }
        // Health bar
        const hpPct = (player.hp / player.maxHp) * 100;
        this.el.playerHealthBar.style.width = hpPct + '%';
        if (hpPct > 50) {
            this.el.playerHealthBar.style.background = 'linear-gradient(to right, #39ff14, #34d399)';
            this.el.playerHealthBar.style.boxShadow = '0 0 8px #39ff14';
        } else if (hpPct > 25) {
            this.el.playerHealthBar.style.background = 'linear-gradient(to right, #ffe600, #ffaa00)';
            this.el.playerHealthBar.style.boxShadow = '0 0 8px #ffe600';
        } else {
            this.el.playerHealthBar.style.background = 'linear-gradient(to right, #ff2d95, #ff0055)';
            this.el.playerHealthBar.style.boxShadow = '0 0 8px #ff2d95';
        }
        this.el.playerHpText.textContent = Math.ceil(player.hp);
        this.el.scoreDisplay.textContent = this.displayedScore;
        this.el.comboCounter.textContent = player.combo;
        this.el.enemyCounter.textContent = enemies.length;
        this.el.waveNumber.textContent = wave;
        // Shield indicator
        if (player.shieldActive) {
            this.el.shieldIndicator.classList.remove('hidden');
            this.el.shieldBar.style.width = (player.shieldTimer / 6 * 100) + '%';
        } else { this.el.shieldIndicator.classList.add('hidden'); }
        // Speed indicator
        this.el.speedIndicator.classList.toggle('hidden', !player.speedBoost);
    }

    // ---- FPS COUNTER ----

    updateFps(dt) {
        this.fpsFrames++;
        this.fpsTime += dt;
        if (this.fpsTime >= 0.5) {
            this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
            this.fpsFrames = 0;
            this.fpsTime = 0;
        }
        if (this.el.fpsCounter) {
            this.el.fpsCounter.classList.toggle('hidden', !this.showFps);
            if (this.showFps) this.el.fpsCounter.textContent = `FPS: ${this.currentFps}`;
        }
    }

    // ---- WAVE ANNOUNCEMENTS ----

    showWaveAnnouncement(wave, isBoss, enemyCount) {
        this.el.waveAnnounceText.textContent = `WAVE ${wave}`;
        this.el.waveAnnounceSub.textContent = isBoss ? '⚠ BOSS WAVE ⚠' : `${enemyCount} enemies incoming`;
        this.el.waveAnnouncement.classList.remove('hidden');
        setTimeout(() => this.el.waveAnnouncement.classList.add('hidden'), 2500);
        if (isBoss) {
            this.el.bossWarning.classList.remove('hidden');
            setTimeout(() => this.el.bossWarning.classList.add('hidden'), 3000);
        }
    }

    showCombo(combo) {
        this.el.comboText.textContent = `${combo}x COMBO!`;
        this.el.comboDisplay.classList.remove('hidden');
        setTimeout(() => this.el.comboDisplay.classList.add('hidden'), 600);
    }

    showGameOver(score, wave, kills, maxCombo, highScore) {
        this.el.gameoverScreen.classList.remove('hidden');
        this.el.finalScore.textContent = score;
        this.el.finalWave.textContent = wave;
        this.el.finalKills.textContent = kills;
        this.el.finalCombo.textContent = maxCombo;
        if (this.el.highScoreDisplay) this.el.highScoreDisplay.textContent = highScore;
    }

    // ---- SCREEN MANAGEMENT ----

    showMenu() {
        this.el.startMenu.classList.remove('hidden');
        this.el.hud.classList.add('hidden');
        this.el.gameoverScreen.classList.add('hidden');
        this.el.pauseMenu.classList.add('hidden');
        // Hide mobile controls in menu
        const mc = document.getElementById('mobile-controls');
        if (mc) mc.classList.add('hidden');
    }

    showGame() {
        this.el.startMenu.classList.add('hidden');
        this.el.gameoverScreen.classList.add('hidden');
        this.el.hud.classList.remove('hidden');
        // Show mobile controls (md:hidden keeps them hidden on desktop)
        const mc = document.getElementById('mobile-controls');
        if (mc) mc.classList.remove('hidden');
    }

    showPause(show) {
        this.el.pauseMenu.classList.toggle('hidden', !show);
    }

    // ---- HUD GLITCH on damage ----
    triggerHudGlitch() {
        this.hudGlitchTimer = 0.3;
        const hud = this.el.hud;
        if (hud) { hud.classList.add('hud-glitch'); setTimeout(() => hud.classList.remove('hud-glitch'), 300); }
    }
}
