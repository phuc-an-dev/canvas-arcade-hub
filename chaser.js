/**
 * ============================================================================
 * NEON CHASER - Survival Evasion Game
 * ============================================================================
 * Extends BaseGame: Player controls a blue square evading incoming red enemies.
 * ============================================================================
 */

class ChaserGame extends BaseGame {
  constructor(canvas, shell) {
    super(canvas, shell, {
      width: 800,
      height: 600,
      storageKey: 'neon_chaser_high_score',
      theme: 'chaser'
    });

    this.player = {
      size: 24,
      x: 0,
      y: 0,
      speed: 280,
      color: '#38bdf8',
      trail: [],
      maxTrail: 6
    };

    this.enemies = [];
    this.survivalTime = 0;
    this.enemyTimer = 0;
    this.enemyInterval = 1000;
  }

  reset() {
    this.player.x = (this.width - this.player.size) / 2;
    this.player.y = (this.height - this.player.size) / 2;
    this.player.trail = [];
    this.enemies = [];
    this.survivalTime = 0;
    this.enemyTimer = 0;
    this.enemyInterval = 1000;
  }

  spawnEnemy(speed) {
    const size = 20;
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    if (edge === 0) { x = Math.random() * (this.width - size); y = -size - 5; }
    else if (edge === 1) { x = this.width + 5; y = Math.random() * (this.height - size); }
    else if (edge === 2) { x = Math.random() * (this.width - size); y = this.height + 5; }
    else { x = -size - 5; y = Math.random() * (this.height - size); }

    this.enemies.push({ x, y, size, speed, color: '#f43f5e' });
  }

  update(dt) {
    this.survivalTime += dt;
    this.score = Math.floor(this.survivalTime * 10);
    this.shell.updateStats(this.score, this.highScore, this.survivalTime.toFixed(1) + 's');

    // Dynamic difficulty scaling
    this.enemyInterval = Math.max(320, 1000 - this.survivalTime * 22);
    const speed = 120 + Math.min(this.survivalTime * 3.2, 160);

    this.enemyTimer += dt * 1000;
    if (this.enemyTimer >= this.enemyInterval) {
      this.spawnEnemy(speed);
      this.enemyTimer = 0;
    }

    // Move player (WASD / Arrows)
    let mx = 0, my = 0;
    if (this.keys.up) my -= 1;
    if (this.keys.down) my += 1;
    if (this.keys.left) mx -= 1;
    if (this.keys.right) mx += 1;

    // Normalize diagonal movement
    if (mx !== 0 && my !== 0) {
      mx /= Math.SQRT2;
      my /= Math.SQRT2;
    }

    if (mx !== 0 || my !== 0) {
      this.player.trail.unshift({ x: this.player.x, y: this.player.y });
      if (this.player.trail.length > this.player.maxTrail) this.player.trail.pop();
    } else if (this.player.trail.length > 0) {
      this.player.trail.pop();
    }

    this.player.x = Math.max(0, Math.min(this.width - this.player.size, this.player.x + mx * this.player.speed * dt));
    this.player.y = Math.max(0, Math.min(this.height - this.player.size, this.player.y + my * this.player.speed * dt));

    // Update enemies and check collisions
    const px = this.player.x + this.player.size / 2;
    const py = this.player.y + this.player.size / 2;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const ex = e.x + e.size / 2;
      const ey = e.y + e.size / 2;
      const dx = px - ex;
      const dy = py - ey;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }

      // Check collision (AABB)
      if (
        this.player.x < e.x + e.size &&
        this.player.x + this.player.size > e.x &&
        this.player.y < e.y + e.size &&
        this.player.y + this.player.size > e.y
      ) {
        this.createExplosion(px, py, '#38bdf8', 35);
        this.createExplosion(px, py, '#f43f5e', 25);
        this.gameOver(this.survivalTime.toFixed(1) + 's');
        break;
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawGrid(ctx, 'rgba(56, 189, 248, 0.04)', 40);

    // Render red enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      ctx.save();
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = 10;
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.size, e.size);
      ctx.fillStyle = '#ffe4e6';
      ctx.fillRect(e.x + 4, e.y + 4, e.size - 8, e.size - 8);
      ctx.restore();
    }

    // Render player & motion trail
    if (this.state !== this.STATE.GAME_OVER) {
      for (let i = 0; i < this.player.trail.length; i++) {
        const pt = this.player.trail[i];
        ctx.save();
        ctx.globalAlpha = (1 - (i + 1) / (this.player.trail.length + 1)) * 0.35;
        ctx.fillStyle = this.player.color;
        ctx.fillRect(pt.x, pt.y, this.player.size, this.player.size);
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 14;
      ctx.fillStyle = this.player.color;
      ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(this.player.x + 4, this.player.y + 4, this.player.size - 8, this.player.size - 8);
      ctx.restore();
    }
  }
}

window.ChaserGame = ChaserGame;
