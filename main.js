/**
 * ============================================================================
 * MAIN CONTROLLER & GAME REGISTRY
 * ============================================================================
 * Dynamically mounts games into the Single Game Shell and synchronizes scores.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Views
  const menuView = document.getElementById('menuView');
  const gameView = document.getElementById('gameView');
  const sharedCanvas = document.getElementById('sharedCanvas');

  // Shell HUD & Elements
  const gameTitle = document.getElementById('gameTitle');
  const gameSubtitle = document.getElementById('gameSubtitle');
  const hudScore = document.getElementById('hudScore');
  const hudHighScore = document.getElementById('hudHighScore');
  const hudExtraBox = document.getElementById('hudExtraBox');
  const hudExtraLabel = document.getElementById('hudExtraLabel');
  const hudExtraValue = document.getElementById('hudExtraValue');
  const gameFooterTip = document.getElementById('gameFooterTip');

  // Shell Overlays
  const startOverlay = document.getElementById('startOverlay');
  const startBadge = document.getElementById('startBadge');
  const startTitle = document.getElementById('startTitle');
  const startDesc = document.getElementById('startDesc');
  const startControls = document.getElementById('startControls');
  const startBtn = document.getElementById('startBtn');

  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreEl = document.getElementById('finalScore');
  const finalExtraRow = document.getElementById('finalExtraRow');
  const finalExtraLabel = document.getElementById('finalExtraLabel');
  const finalExtraVal = document.getElementById('finalExtraVal');
  const finalHighScoreEl = document.getElementById('finalHighScore');
  const restartBtn = document.getElementById('restartBtn');

  // Menu Badges
  const menuChaserHighScore = document.getElementById('menuChaserHighScore');
  const menuSnakeHighScore = document.getElementById('menuSnakeHighScore');
  const menuFlappyHighScore = document.getElementById('menuFlappyHighScore');

  let activeGameInstance = null;

  // --- Shell UI Controller Interface ---
  const shellUI = {
    updateStats(score, highScore, extraVal = null) {
      if (hudScore) hudScore.textContent = score;
      if (hudHighScore) hudHighScore.textContent = highScore;
      if (extraVal !== null && hudExtraValue) {
        hudExtraValue.textContent = extraVal;
      }
    },
    showStartOverlay() {
      if (startOverlay) startOverlay.classList.remove('hidden');
      if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    },
    hideOverlays() {
      if (startOverlay) startOverlay.classList.add('hidden');
      if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    },
    showGameOverOverlay(finalScore, finalHighScore, finalExtra = null) {
      if (finalScoreEl) finalScoreEl.textContent = finalScore;
      if (finalHighScoreEl) finalHighScoreEl.textContent = finalHighScore;

      if (finalExtra && finalExtraRow && finalExtraVal) {
        finalExtraRow.style.display = 'flex';
        finalExtraVal.textContent = finalExtra;
      } else if (finalExtraRow) {
        finalExtraRow.style.display = 'none';
      }

      if (gameOverOverlay) gameOverOverlay.classList.remove('hidden');
    }
  };

  // --- Game Registry ---
  const GAME_REGISTRY = {
    chaser: {
      name: 'NEON CHASER',
      subtitle: 'Evade the Red Swarm',
      badge: 'SURVIVAL • EVASION',
      desc: 'Control the blue square to evade incoming red enemies. Survive as long as you can to score high!',
      theme: 'chaser',
      storageKey: 'neon_chaser_high_score',
      extraLabel: 'TIME',
      footerTip: 'Use W A S D or Arrow Keys to move',
      create: (canvas, shell) => new ChaserGame(canvas, shell),
      controlsHTML: `
        <div class="key-group">
          <span class="key-pill">W</span>
          <div class="key-row">
            <span class="key-pill">A</span>
            <span class="key-pill">S</span>
            <span class="key-pill">D</span>
          </div>
        </div>
        <span class="or-text">or</span>
        <div class="key-group">
          <span class="key-pill"><svg class="key-icon"><use href="#icon-up"></use></svg></span>
          <div class="key-row">
            <span class="key-pill"><svg class="key-icon"><use href="#icon-left"></use></svg></span>
            <span class="key-pill"><svg class="key-icon"><use href="#icon-down"></use></svg></span>
            <span class="key-pill"><svg class="key-icon"><use href="#icon-right"></use></svg></span>
          </div>
        </div>`
    },
    snake: {
      name: 'NEON SNAKE',
      subtitle: 'Retro Glow Snake',
      badge: 'CLASSIC • SNAKE',
      desc: 'Guide the glowing snake to eat red apples (+10 pts) and golden bonus (+35 pts). Avoid walls and your own tail!',
      theme: 'snake',
      storageKey: 'neon_snake_high_score',
      extraLabel: 'LENGTH',
      footerTip: 'Use W A S D or Arrow Keys to change direction',
      create: (canvas, shell) => new SnakeGame(canvas, shell),
      controlsHTML: `
        <div class="key-group">
          <span class="key-pill">W</span>
          <div class="key-row">
            <span class="key-pill">A</span>
            <span class="key-pill">S</span>
            <span class="key-pill">D</span>
          </div>
        </div>
        <span class="or-text">or</span>
        <div class="key-group">
          <span class="key-pill"><svg class="key-icon"><use href="#icon-up"></use></svg></span>
          <div class="key-row">
            <span class="key-pill"><svg class="key-icon"><use href="#icon-left"></use></svg></span>
            <span class="key-pill"><svg class="key-icon"><use href="#icon-down"></use></svg></span>
            <span class="key-pill"><svg class="key-icon"><use href="#icon-right"></use></svg></span>
          </div>
        </div>`
    },
    flappy: {
      name: 'NEON FLAPPY BIRD',
      subtitle: 'Neon Sky Flight',
      badge: 'ARCADE • FLAP',
      desc: 'Guide the neon bird through glowing purple energy pipes. Avoid touching pipes or falling to the ground!',
      theme: 'flappy',
      storageKey: 'neon_flappy_high_score',
      extraLabel: null,
      footerTip: 'Press Space, W, Up Arrow, or Click to flap wings',
      create: (canvas, shell) => new FlappyGame(canvas, shell),
      controlsHTML: `
        <span class="key-pill wide">Space</span>
        <span class="or-text">or</span>
        <span class="key-pill"><svg class="key-icon"><use href="#icon-up"></use></svg></span>
        <span class="or-text">or</span>
        <span class="mouse-hint">Click mouse</span>`
    }
  };

  // Synchronize high scores on the menu cards
  function refreshMenuHighScores() {
    if (menuChaserHighScore) menuChaserHighScore.textContent = localStorage.getItem('neon_chaser_high_score') || 0;
    if (menuSnakeHighScore) menuSnakeHighScore.textContent = localStorage.getItem('neon_snake_high_score') || 0;
    if (menuFlappyHighScore) menuFlappyHighScore.textContent = localStorage.getItem('neon_flappy_high_score') || 0;
  }

  // Mount and start selected game in the shell
  function launchGame(gameKey) {
    const config = GAME_REGISTRY[gameKey];
    if (!config) return;

    // 1. Deactivate old game if running
    if (activeGameInstance) {
      activeGameInstance.deactivate();
      activeGameInstance = null;
    }

    // 2. Update Shell UI according to Scoped Theme
    gameView.setAttribute('data-theme', config.theme);
    gameTitle.textContent = config.name;
    gameSubtitle.textContent = config.subtitle;
    startBadge.textContent = config.badge;
    startTitle.textContent = config.name;
    startDesc.textContent = config.desc;
    startControls.innerHTML = config.controlsHTML;
    gameFooterTip.textContent = config.footerTip;

    if (config.extraLabel && hudExtraBox && hudExtraLabel) {
      hudExtraBox.style.display = 'flex';
      hudExtraLabel.textContent = config.extraLabel;
    } else if (hudExtraBox) {
      hudExtraBox.style.display = 'none';
    }

    // 3. Switch views
    menuView.classList.add('hidden-view');
    gameView.classList.remove('hidden-view');

    // 4. Create and activate game instance
    activeGameInstance = config.create(sharedCanvas, shellUI);
    activeGameInstance.activate();
  }

  // Return back to Home Menu
  function returnToMenu() {
    if (activeGameInstance) {
      activeGameInstance.deactivate();
      activeGameInstance = null;
    }
    gameView.classList.add('hidden-view');
    menuView.classList.remove('hidden-view');
    refreshMenuHighScores();
  }

  // Bind menu card launch buttons
  document.querySelectorAll('[data-launch]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.getAttribute('data-launch');
      launchGame(key);
    });
  });

  // Bind all back-to-menu buttons
  document.querySelectorAll('.back-to-menu-btn').forEach(btn => {
    btn.addEventListener('click', returnToMenu);
  });

  // Bind Start and Restart buttons
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (activeGameInstance) activeGameInstance.start();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (activeGameInstance) activeGameInstance.start();
    });
  }

  // Initial load
  refreshMenuHighScores();
});
