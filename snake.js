/**
 * ============================================================================
 * NEON SNAKE - Retro Glow Snake Game
 * ============================================================================
 * Extends BaseGame: Grid movement, apples & bonus items, self/wall collision.
 * ============================================================================
 */

class SnakeGame extends BaseGame {
  constructor(canvas, shell) {
    super(canvas, shell, {
      width: 800,
      height: 600,
      storageKey: 'neon_snake_high_score',
      theme: 'snake'
    });

    this.COLS = 40;
    this.ROWS = 30;
    this.CELL = 20;

    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = { x: 0, y: 0 };
    this.bonusFood = null;
    this.stepTimer = 0;
    this.stepInterval = 0.11; // 110ms
  }

  reset() {
    this.snake = [
      { x: 12, y: 15 },
      { x: 11, y: 15 },
      { x: 10, y: 15 },
      { x: 9, y: 15 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.bonusFood = null;
    this.stepTimer = 0;
    this.stepInterval = 0.11;
    this.spawnFood();
  }

  onKeyPress(code, key) {
    let target = null;
    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') target = { x: 0, y: -1 };
    else if (code === 'KeyS' || code === 'ArrowDown' || key === 's') target = { x: 0, y: 1 };
    else if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') target = { x: -1, y: 0 };
    else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') target = { x: 1, y: 0 };

    // Prevent immediate 180-degree self-reversal
    if (target && (target.x !== -this.dir.x || target.y !== -this.dir.y)) {
      this.nextDir = target;
    }
  }

  spawnFood() {
    let valid = false;
    while (!valid) {
      this.food = {
        x: Math.floor(Math.random() * this.COLS),
        y: Math.floor(Math.random() * this.ROWS)
      };
      valid = !this.snake.some(s => s.x === this.food.x && s.y === this.food.y);
    }
  }

  spawnBonusFood() {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 40) {
      attempts++;
      const candidate = {
        x: Math.floor(Math.random() * this.COLS),
        y: Math.floor(Math.random() * this.ROWS),
        duration: 35
      };
      valid = !this.snake.some(s => s.x === candidate.x && s.y === candidate.y) &&
              (candidate.x !== this.food.x || candidate.y !== this.food.y);
      if (valid) this.bonusFood = candidate;
    }
  }

  update(dt) {
    this.stepTimer += dt;
    if (this.stepTimer < this.stepInterval) return;
    this.stepTimer = 0;

    this.dir = this.nextDir;
    const head = this.snake[0];
    const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // 1. Wall collision
    if (newHead.x < 0 || newHead.x >= this.COLS || newHead.y < 0 || newHead.y >= this.ROWS) {
      this.createExplosion(head.x * this.CELL + 10, head.y * this.CELL + 10, '#f43f5e', 35);
      this.gameOver('Length: ' + this.snake.length);
      return;
    }

    // 2. Self collision
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.createExplosion(head.x * this.CELL + 10, head.y * this.CELL + 10, '#f43f5e', 35);
        this.gameOver('Length: ' + this.snake.length);
        return;
      }
    }

    this.snake.unshift(newHead);

    // 3. Normal food
    let ate = false;
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      window.soundFX.playScore();
      this.createExplosion(this.food.x * this.CELL + 10, this.food.y * this.CELL + 10, '#f43f5e', 18);
      this.spawnFood();
      this.stepInterval = Math.max(0.065, 0.11 - Math.floor(this.snake.length / 3) * 0.003);
      if (!this.bonusFood && Math.random() < 0.25) this.spawnBonusFood();
      ate = true;
    }

    // 4. Bonus golden food
    if (this.bonusFood && newHead.x === this.bonusFood.x && newHead.y === this.bonusFood.y) {
      this.score += 35;
      window.soundFX.playBonus();
      this.createExplosion(this.bonusFood.x * this.CELL + 10, this.bonusFood.y * this.CELL + 10, '#facc15', 25);
      this.bonusFood = null;
      ate = true;
    }

    if (this.bonusFood) {
      this.bonusFood.duration--;
      if (this.bonusFood.duration <= 0) this.bonusFood = null;
    }

    if (!ate) this.snake.pop();

    this.shell.updateStats(this.score, this.highScore, 'Len: ' + this.snake.length);
  }

  draw(ctx) {
    const cs = this.CELL;
    ctx.fillStyle = '#050a12';
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawGrid(ctx, 'rgba(16, 185, 129, 0.04)', cs);

    // Render normal apple
    const fx = this.food.x * cs + cs / 2;
    const fy = this.food.y * cs + cs / 2;
    ctx.save();
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(fx, fy, cs / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Render bonus golden fruit
    if (this.bonusFood) {
      const bx = this.bonusFood.x * cs + cs / 2;
      const by = this.bonusFood.y * cs + cs / 2;
      ctx.save();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(bx, by, cs / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render snake segments
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const seg = this.snake[i];
      const px = seg.x * cs;
      const py = seg.y * cs;

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, cs - 2, cs - 2, 5);
        ctx.fill();

        // Eyes oriented by direction
        ctx.fillStyle = '#064e3b';
        let e1 = { x: px + 5, y: py + 5 }, e2 = { x: px + cs - 7, y: py + 5 };
        if (this.dir.x === 1) { e1 = { x: px + cs - 6, y: py + 5 }; e2 = { x: px + cs - 6, y: py + cs - 7 }; }
        else if (this.dir.x === -1) { e1 = { x: px + 4, y: py + 5 }; e2 = { x: px + 4, y: py + cs - 7 }; }
        else if (this.dir.y === 1) { e1 = { x: px + 5, y: py + cs - 6 }; e2 = { x: px + cs - 7, y: py + cs - 6 }; }
        ctx.beginPath();
        ctx.arc(e1.x, e1.y, 2, 0, Math.PI * 2);
        ctx.arc(e2.x, e2.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const factor = 1 - (i / this.snake.length) * 0.45;
        ctx.fillStyle = `rgba(16, 185, 129, ${factor})`;
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, cs - 4, cs - 4, 4);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

window.SnakeGame = SnakeGame;
