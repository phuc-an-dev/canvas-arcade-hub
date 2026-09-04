/**
 * ============================================================================
 * NEON FLAPPY BIRD - Neon Sky Flight Game
 * ============================================================================
 * Extends BaseGame: Controls bird flap, free-fall gravity, and glowing pipes.
 * ============================================================================
 */

class FlappyGame extends BaseGame {
  constructor(canvas, shell) {
    super(canvas, shell, {
      width: 800,
      height: 600,
      storageKey: 'neon_flappy_high_score',
      theme: 'flappy'
    });

    this.GROUND_Y = 560;
    this.bird = {
      x: 200,
      y: 280,
      radius: 16,
      vy: 0,
      gravity: 920,
      jumpForce: -340,
      rotation: 0,
      wingTimer: 0
    };

    this.pipes = [];
    this.pipeWidth = 65;
    this.pipeGap = 165;
    this.pipeSpeed = 200;
    this.pipeTimer = 0;
    this.pipeInterval = 1.6;
    this.groundOffset = 0;

    // Pointer click on canvas to flap
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      e.preventDefault();
      if (this.state === this.STATE.PLAYING) this.jump();
      else if (this.state === this.STATE.IDLE || this.state === this.STATE.GAME_OVER) this.start();
    });
  }

  reset() {
    this.bird.x = 200;
    this.bird.y = 280;
    this.bird.vy = 0;
    this.bird.rotation = 0;
    this.bird.wingTimer = 0;
    this.pipes = [];
    this.pipeTimer = 0.5;
  }

  onKeyPress(code) {
    if (this.state === this.STATE.PLAYING && (code === 'Space' || code === 'ArrowUp' || code === 'KeyW')) {
      this.jump();
    }
  }

  jump() {
    this.bird.vy = this.bird.jumpForce;
    window.soundFX.playJump();

    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.bird.x - 12,
        y: this.bird.y + (Math.random() - 0.5) * 8,
        vx: -Math.random() * 80 - 20,
        vy: (Math.random() - 0.5) * 60,
        size: Math.random() * 3 + 2,
        color: '#fbbf24',
        alpha: 1,
        decay: 2.5
      });
    }
  }

  spawnPipe() {
    const minH = 60;
    const maxH = this.GROUND_Y - this.pipeGap - minH;
    const topH = Math.floor(Math.random() * (maxH - minH + 1)) + minH;

    this.pipes.push({
      x: this.width + 10,
      topH,
      bottomY: topH + this.pipeGap,
      bottomH: this.GROUND_Y - (topH + this.pipeGap),
      passed: false
    });
  }

  checkCollision(pipe) {
    const bx = this.bird.x, by = this.bird.y, r = this.bird.radius - 2;
    // Top pipe
    if (bx + r > pipe.x && bx - r < pipe.x + this.pipeWidth && by - r < pipe.topH) return true;
    // Bottom pipe
    if (bx + r > pipe.x && bx - r < pipe.x + this.pipeWidth && by + r > pipe.bottomY) return true;
    return false;
  }

  update(dt) {
    this.groundOffset = (this.groundOffset + this.pipeSpeed * dt) % 30;

    // Bird physics
    this.bird.vy += this.bird.gravity * dt;
    this.bird.y += this.bird.vy * dt;
    this.bird.wingTimer += dt * 8;
    this.bird.rotation = this.bird.vy < 0 ? Math.max(-0.4, this.bird.vy / 600) : Math.min(1.2, this.bird.vy / 400);

    // Floor or ceiling bounds
    if (this.bird.y - this.bird.radius <= 0) {
      this.bird.y = this.bird.radius;
      this.bird.vy = 0;
    }
    if (this.bird.y + this.bird.radius >= this.GROUND_Y) {
      this.bird.y = this.GROUND_Y - this.bird.radius;
      this.createExplosion(this.bird.x, this.bird.y, '#f59e0b', 30);
      this.gameOver();
      return;
    }

    // Pipe manager
    this.pipeTimer += dt;
    if (this.pipeTimer >= this.pipeInterval) {
      this.spawnPipe();
      this.pipeTimer = 0;
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= this.pipeSpeed * dt;

      if (!p.passed && p.x + this.pipeWidth < this.bird.x) {
        p.passed = true;
        this.score += 1;
        window.soundFX.playScore();
        this.shell.updateStats(this.score, this.highScore);
      }

      if (this.checkCollision(p)) {
        this.createExplosion(this.bird.x, this.bird.y, '#a855f7', 35);
        this.gameOver();
        return;
      }

      if (p.x + this.pipeWidth < -20) {
        this.pipes.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#060813';
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawGrid(ctx, 'rgba(168, 85, 247, 0.04)', 40);

    // Render pipes
    for (let i = 0; i < this.pipes.length; i++) {
      const p = this.pipes[i];
      const grad = ctx.createLinearGradient(p.x, 0, p.x + this.pipeWidth, 0);
      grad.addColorStop(0, '#581c87');
      grad.addColorStop(0.5, '#9333ea');
      grad.addColorStop(1, '#c084fc');

      ctx.save();
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;

      // Top pipe
      ctx.fillRect(p.x, 0, this.pipeWidth, p.topH);
      ctx.strokeRect(p.x, -2, this.pipeWidth, p.topH + 2);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(p.x - 3, p.topH - 18, this.pipeWidth + 6, 18);

      // Bottom pipe
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.bottomY, this.pipeWidth, p.bottomH);
      ctx.strokeRect(p.x, p.bottomY, this.pipeWidth, p.bottomH);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(p.x - 3, p.bottomY, this.pipeWidth + 6, 18);
      ctx.restore();
    }

    // Ground
    ctx.save();
    ctx.fillStyle = '#0a0d1d';
    ctx.fillRect(0, this.GROUND_Y, this.width, this.height - this.GROUND_Y);
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.GROUND_Y);
    ctx.lineTo(this.width, this.GROUND_Y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -30; x < this.width + 30; x += 30) {
      const sx = x - this.groundOffset;
      ctx.moveTo(sx, this.GROUND_Y);
      ctx.lineTo(sx + 15, this.height);
    }
    ctx.stroke();
    ctx.restore();

    // Render Bird
    if (this.state !== this.STATE.GAME_OVER) {
      ctx.save();
      ctx.translate(this.bird.x, this.bird.y);
      ctx.rotate(this.bird.rotation);

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, this.bird.radius, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(8, -5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(21, 2);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();

      // Wing
      const wy = Math.sin(this.bird.wingTimer) * 4;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(-6, 2 + wy, 7, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

window.FlappyGame = FlappyGame;
