// ============================================
// NEON FURY — Audio System
// Procedural sound effects & music via Web Audio API
// No external audio files needed!
// ============================================

export class SoundManager {
    constructor() {
        this.ctx = null;          // AudioContext
        this.musicGain = null;    // Volume control for music
        this.sfxGain = null;      // Volume control for sound effects
        this.musicPlaying = false;
        this.musicVolume = 0.15;
        this.sfxVolume = 0.3;
    }

    /**
     * Initialize the Web Audio API context
     * Must be called after a user interaction (browser policy)
     */
    init() {
        if (this.ctx) return; // Already initialized
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Music volume node
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.ctx.destination);
            // SFX volume node
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API unavailable:', e);
        }
    }

    /**
     * Play a procedurally generated sound effect
     * @param {string} type - Sound name (punch, kick, blast, etc.)
     */
    play(type) {
        if (!this.ctx) return;
        switch (type) {
            // ---- Combat sounds ----
            case 'punch':
                this._noise(0.1, 200, 80, 'square');
                break;
            case 'kick':
                this._noise(0.15, 150, 50, 'sawtooth');
                break;
            case 'blast':
                this._sweep(0.3, 800, 200, 'sine');
                break;
            case 'hit':
                this._noise(0.08, 300, 100, 'square');
                break;
            case 'explosion':
                this._explosion();
                break;

            // ---- Ability sounds ----
            case 'powerup':
                this._sweep(0.3, 400, 1200, 'sine');
                break;
            case 'jump':
                this._sweep(0.1, 200, 600, 'square');
                break;
            case 'shield':
                this._sweep(0.2, 600, 1000, 'sine');
                break;
            case 'combo':
                this._sweep(0.15, 500, 1500, 'sine');
                break;
            case 'teleport':
                this._sweep(0.2, 1200, 200, 'sine');
                this._sweep(0.15, 200, 1400, 'sine');
                break;

            // ---- Game state sounds ----
            case 'death':
                this._sweep(0.5, 500, 50, 'sawtooth');
                break;
            case 'wave':
                this._sweep(0.4, 300, 900, 'sine');
                break;
            case 'boss':
                this._bossSiren();
                break;

            // ---- Cheat & UI sounds ----
            case 'cheat':
                this._cheatActivate();
                break;
            case 'coin':
                this._sweep(0.1, 800, 1200, 'square');
                this._sweep(0.1, 1000, 1400, 'square');
                break;
            case 'upgrade':
                this._sweep(0.2, 400, 800, 'sine');
                this._sweep(0.15, 600, 1200, 'sine');
                break;
            case 'console':
                this._noise(0.05, 800, 600, 'square');
                break;
            case 'meteor':
                this._noise(0.3, 100, 40, 'sawtooth');
                this._explosion();
                break;
            case 'siren':
                this._bossSiren();
                break;
        }
    }

    // ---- Internal sound generators ----

    /**
     * Short noise burst — used for impacts
     */
    _noise(dur, fStart, fEnd, type) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(fStart, this.ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(
            Math.max(fEnd, 1),
            this.ctx.currentTime + dur
        );
        g.gain.setValueAtTime(0.3, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start();
        o.stop(this.ctx.currentTime + dur);
    }

    /**
     * Frequency sweep — used for whoosh/power-up effects
     */
    _sweep(dur, fStart, fEnd, type) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(fStart, this.ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(
            Math.max(fEnd, 1),
            this.ctx.currentTime + dur
        );
        g.gain.setValueAtTime(0.2, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start();
        o.stop(this.ctx.currentTime + dur);
    }

    /**
     * White noise explosion — rumbling boom effect
     */
    _explosion() {
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        src.buffer = buffer;
        g.gain.setValueAtTime(0.3, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        src.connect(g);
        g.connect(this.sfxGain);
        src.start();
    }

    /**
     * Boss warning siren — two-tone alarm
     */
    _bossSiren() {
        const now = this.ctx.currentTime;
        for (let i = 0; i < 4; i++) {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'sawtooth';
            const freq = i % 2 === 0 ? 200 : 300;
            o.frequency.setValueAtTime(freq, now + i * 0.3);
            o.frequency.exponentialRampToValueAtTime(
                freq * 2,
                now + i * 0.3 + 0.15
            );
            g.gain.setValueAtTime(0.15, now + i * 0.3);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.28);
            o.connect(g);
            g.connect(this.sfxGain);
            o.start(now + i * 0.3);
            o.stop(now + i * 0.3 + 0.29);
        }
    }

    /**
     * Cheat activation — ascending arpeggio with digital flavor
     */
    _cheatActivate() {
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.15, now + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
            o.connect(g);
            g.connect(this.sfxGain);
            o.start(now + i * 0.08);
            o.stop(now + i * 0.08 + 0.16);
        });
    }

    // ---- Music System ----

    /**
     * Start the procedural cyberpunk music loop
     */
    startMusic() {
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;
        this._playMusicLoop();
    }

    /**
     * Generate one bar of cyberpunk music and schedule the next
     * Uses bass + lead + arpeggio layers for a richer sound
     */
    _playMusicLoop() {
        if (!this.musicPlaying) return;
        const now = this.ctx.currentTime;
        const bpm = 140;
        const beatDur = 60 / bpm;

        // ---- Bass line (low octave square wave) ----
        const bassNotes = [65.41, 73.42, 82.41, 73.42, 65.41, 82.41, 65.41, 73.42];
        bassNotes.forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.08, now + i * beatDur);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * beatDur + beatDur * 0.9);
            o.connect(g);
            g.connect(this.musicGain);
            o.start(now + i * beatDur);
            o.stop(now + i * beatDur + beatDur * 0.95);
        });

        // ---- Arpeggio layer (high sine pings) ----
        const arpNotes = [523, 659, 784, 659, 523, 784, 1047, 784];
        arpNotes.forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.03, now + i * beatDur * 0.5);
            g.gain.exponentialRampToValueAtTime(0.005, now + i * beatDur * 0.5 + beatDur * 0.4);
            o.connect(g);
            g.connect(this.musicGain);
            o.start(now + i * beatDur * 0.5);
            o.stop(now + i * beatDur * 0.5 + beatDur * 0.45);
        });

        // Schedule next bar
        const barDuration = bassNotes.length * beatDur;
        setTimeout(() => this._playMusicLoop(), barDuration * 1000 - 50);
    }

    /**
     * Stop the music loop
     */
    stopMusic() {
        this.musicPlaying = false;
    }

    /**
     * Set SFX volume (0 to 1)
     */
    setSFXVolume(vol) {
        this.sfxVolume = vol;
        if (this.sfxGain) this.sfxGain.gain.value = vol;
    }

    /**
     * Set music volume (0 to 1)
     */
    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.musicGain) this.musicGain.gain.value = vol;
    }
}
