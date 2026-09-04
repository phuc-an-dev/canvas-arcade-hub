/**
 * ============================================================================
 * CANVAS ARCADE MICRO-ENGINE
 * ============================================================================
 * Shared core for all canvas arcade games:
 * 1. BaseGame: Delta-time game loop, Retina DPI scaling, Screen Shake, High Score.
 * 2. ParticleSystem: Shared particle explosions and glowing trails.
 * 3. SoundFX: Retro 8-bit synthesizer using Web Audio API (Zero dependency).
 * 4. InputManager: Normalized keyboard bindings with scroll prevention.
 * ============================================================================
 */

// --- 1. SoundFX (Web Audio API Retro Synthesizer) ---
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Ignored if browser blocks autoplay audio
    }
  }

  // Sound on jump / move
  playJump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  // Sound on score point / passed pipe
  playScore() {
    this.playTone(587.33, 'triangle', 0.12, 0.18); // D5
    setTimeout(() => this.playTone(880, 'triangle', 0.16, 0.15), 60); // A5
  }

  // Sound on golden bonus item
  playBonus() {
    this.playTone(523.25, 'sine', 0.08, 0.2);
    setTimeout(() => this.playTone(659.25, 'sine', 0.08, 0.2), 70);
    setTimeout(() => this.playTone(783.99, 'sine', 0.15, 0.25), 140);
  }

  // Sound on hit / explosion / game over
  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }
}

// Global Sound instance
window.soundFX = new SoundFX();


// --- 2. BaseGame Class ---
class BaseGame {
  constructor(canvas, shell, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shell = shell; // Shared shell UI controller
    this.config = Object.assign({
      width: 800,
      height: 600,
      storageKey: 'arcade_game_high_score',
      theme: 'chaser'
    }, config);

    this.width = this.config.width;
    this.height = this.config.height;

    // Shared game state
    this.STATE = { IDLE: 'IDLE', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
    this.state = this.STATE.IDLE;
    this.active = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem(this.config.storageKey), 10) || 0;

    // Timing & loop
    this.animationFrameId = null;
    this.lastTime = 0;
    this.screenShake = 0;
    this.particles = [];

    // Keyboard state
    this.keys = { up: false, down: false, left: false, right: false, space: false };
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);

    // Retina Display DPI Scaling
    this.setupDPI();
  }

  setupDPI() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  // Bind/unbind keyboard listeners
  bindInput() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  unbindInput() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.keys = { up: false, down: false, left: false, right: false, space: false };
  }

  handleKeyDown(e) {
    if (!this.active) return;
    const code = e.code;
    const key = e.key.toLowerCase();

    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') this.keys.up = true;
    if (code === 'KeyS' || code === 'ArrowDown' || key === 's') this.keys.down = true;
    if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') this.keys.left = true;
    if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') this.keys.right = true;
    if (code === 'Space') this.keys.space = true;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }

    if (code === 'Space' || code === 'Enter') {
      if (this.state === this.STATE.IDLE || this.state === this.STATE.GAME_OVER) {
        this.start();
        return;
      }
    }

    if (this.onKeyPress) this.onKeyPress(code, key);
  }

  handleKeyUp(e) {
    if (!this.active) return;
    const code = e.code;
    const key = e.key.toLowerCase();

    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') this.keys.up = false;
    if (code === 'KeyS' || code === 'ArrowDown' || key === 's') this.keys.down = false;
    if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') this.keys.left = false;
    if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') this.keys.right = false;
    if (code === 'Space') this.keys.space = false;
  }

  // Activate game view
  activate() {
    this.active = true;
    this.state = this.STATE.IDLE;
    this.bindInput();
    this.reset();
    this.shell.showStartOverlay();
    this.shell.updateStats(0, this.highScore);
    this.drawInitial();
  }

  // Deactivate game view when returning to menu
  deactivate() {
    this.active = false;
    this.state = this.STATE.IDLE;
    this.unbindInput();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Start new round
  start() {
    this.state = this.STATE.PLAYING;
    this.score = 0;
    this.particles = [];
    this.screenShake = 0;
    this.reset();
    this.shell.hideOverlays();
    this.shell.updateStats(0, this.highScore);
    window.soundFX.playJump();

    this.lastTime = performance.now();
    if (!this.animationFrameId) {
      this.loop(performance.now());
    }
  }

  // End round
  gameOver(finalExtraStat = null) {
    this.state = this.STATE.GAME_OVER;
    window.soundFX.playHit();
    this.triggerShake(14);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.config.storageKey, this.highScore);
    }

    setTimeout(() => {
      if (this.state === this.STATE.GAME_OVER) {
        this.shell.showGameOverOverlay(this.score, this.highScore, finalExtraStat);
      }
    }, 450);
  }

  // Screen shake
  triggerShake(intensity = 12) {
    this.screenShake = intensity;
  }

  // Shared particle explosion
  createExplosion(x, y, color = '#38bdf8', count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 1.5 + 1.2
      });
    }
  }

  // Update particles
  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Render particles
  drawParticles(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  // Shared background grid
  drawGrid(ctx, strokeColor = 'rgba(255, 255, 255, 0.035)', size = 40) {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Main game loop
  loop(timestamp) {
    if (!this.active) {
      this.animationFrameId = null;
      return;
    }

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // 1. Update
    this.updateParticles(dt);
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 30);
    }
    if (this.state === this.STATE.PLAYING) {
      this.update(dt);
    }

    // 2. Render
    this.ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2;
      const sy = (Math.random() - 0.5) * this.screenShake * 2;
      this.ctx.translate(sx, sy);
    }

    this.draw(this.ctx);
    this.drawParticles(this.ctx);
    this.ctx.restore();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  // To be implemented by subclasses:
  reset() {}
  update(dt) {}
  draw(ctx) {}
  drawInitial() {
    this.ctx.fillStyle = '#050811';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawGrid(this.ctx);
  }
}

window.BaseGame = BaseGame;
