// Charity: water - Water Drop Game
// Difficulty modes with Exponential droplet fall acceleration

const DIFFICULTIES = {
  easy: {
    id: "easy",
    name: "Easy",
    label: "Easy Mode",
    baseDuration: 4.6,       // Starting fall duration in seconds
    minDuration: 1.5,        // Clamped minimum duration (top speed cap)
    exponentialK: 0.022,     // Speed increases by ~25% every 10s: v(t) = v0 * e^(k*t)
    baseInterval: 1150,      // Starting spawn interval in ms
    minInterval: 620,        // Minimum spawn interval in ms
    intervalDecayK: 0.015,   // Interval decay factor
    badDropChance: 0.15,     // 15% dirty drops
    color: "#4fcb53",
    description: "<strong>Easy Mode:</strong> Relaxed start with gentle exponential speed acceleration (+25% every 10s). Great for beginners!"
  },
  normal: {
    id: "normal",
    name: "Normal",
    label: "Normal Mode",
    baseDuration: 3.2,
    minDuration: 0.85,
    exponentialK: 0.038,     // Speed increases by ~46% every 10s: v(t) = v0 * e^(k*t)
    baseInterval: 920,
    minInterval: 380,
    intervalDecayK: 0.022,
    badDropChance: 0.25,     // 25% dirty drops
    color: "#ffc907",
    description: "<strong>Normal Mode:</strong> Balanced initial speed with moderate exponential acceleration (+46% every 10s). Droplets fall noticeably faster each second!"
  },
  hard: {
    id: "hard",
    name: "Hard",
    label: "Hard Mode",
    baseDuration: 2.1,
    minDuration: 0.42,
    exponentialK: 0.058,     // Speed increases by ~78% every 10s: v(t) = v0 * e^(k*t)
    baseInterval: 720,
    minInterval: 220,
    intervalDecayK: 0.032,
    badDropChance: 0.35,     // 35% dirty drops
    color: "#f5402c",
    description: "<strong>Hard Mode:</strong> Fast drops with rapid exponential acceleration (+78% every 10s). Lightning-fast reflexes required!"
  }
};

// Winning and Encouragement messages (as per charity: water theme)
const WINNING_MESSAGES = [
  "Incredible work! You brought clean water to a whole community!",
  "Water hero! Your speed and precision saved countless drops!",
  "Outstanding effort! You conquered the exponential rainstorm!",
  "Legendary catching skills! Safe, clean water for everyone!"
];

const TRY_AGAIN_MESSAGES = [
  "Good try! Every drop counts. Jump back in and aim higher!",
  "Keep practicing! Those accelerating drops get tricky fast!",
  "Clean water takes perseverance! Try again and beat your score!",
  "Almost there! Focus on the clean blue drops and watch your speed!"
];

// Milestone messages for every score increase of 10 points
const MILESTONE_MESSAGES = {
  10: {
    title: "10 Clean Drops!",
    desc: "A single ripple can become a wave. Great start!",
    icon: "💧",
    tag: "10 pts"
  },
  20: {
    title: "20 Drops Milestone!",
    desc: "Clean water transforms health, education, and entire futures!",
    icon: "🌊",
    tag: "20 pts"
  },
  30: {
    title: "30 Drops Unlocked!",
    desc: "Exponential speed is ramping up — lightning reflexes!",
    icon: "⚡",
    tag: "30 pts"
  },
  40: {
    title: "40 Drops Milestone!",
    desc: "Community hero! Safe water saved for dozens of families!",
    icon: "🌟",
    tag: "40 pts"
  },
  50: {
    title: "50 Drops Master!",
    desc: "Half-century mark! You are an unstoppable clean water champion!",
    icon: "🏆",
    tag: "50 pts"
  },
  60: {
    title: "60 Drops Legend!",
    desc: "Supersonic catching in a torrent of accelerating drops!",
    icon: "🚀",
    tag: "60 pts"
  },
  70: {
    title: "70 Drops Powerhouse!",
    desc: "Phenomenal focus! Every drop collected brings hope and life.",
    icon: "✨",
    tag: "70 pts"
  },
  80: {
    title: "80 Drops Titan!",
    desc: "Godlike agility! Dominating the fiercest exponential storm!",
    icon: "👑",
    tag: "80 pts"
  },
  90: {
    title: "90 Drops Phenomenon!",
    desc: "Almost triple digits! Flawless concentration under pressure!",
    icon: "💎",
    tag: "90 pts"
  },
  100: {
    title: "100 Drops Century Hero!",
    desc: "Triple-digit triumph! Safe water for entire communities worldwide!",
    icon: "🌍",
    tag: "100 pts"
  }
};

function getMilestoneData(tier) {
  if (MILESTONE_MESSAGES[tier]) {
    return MILESTONE_MESSAGES[tier];
  }
  return {
    title: `${tier} Drops Milestone!`,
    desc: `Incredible milestone streak! ${tier} drops preserved against exponential speed!`,
    icon: "🏆",
    tag: `${tier} pts`
  };
}

// Game State variables
let currentDifficulty = "normal";
let gameRunning = false;
let dropMaker = null;
let gameClock = null;
let elapsedSeconds = 0;
let score = 0;
let dropsCaught = 0;
let peakSpeedMultiplier = 1.0;
let soundEnabled = true;
let bucketX = null;
let isKeyboardMoving = false;
let keyState = { left: false, right: false };
let keyMoveRaf = null;
let lastMilestoneReached = 0;
let milestoneTimeout = null;

// DOM Elements
const gameContainer = document.getElementById("game-container");
const visualEffectsLayer = document.getElementById("visual-effects-layer");
const bucket = document.getElementById("bucket");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const speedDisplay = document.getElementById("speed-multiplier");
const highScoreDisplay = document.getElementById("high-score");
const highScoreModeDisplay = document.getElementById("high-score-mode");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const soundButton = document.getElementById("sound-btn");
const difficultyDesc = document.getElementById("difficulty-desc");
const difficultyButtons = document.querySelectorAll(".diff-btn");

// Milestone Elements
const milestoneBanner = document.getElementById("milestone-banner");
const milestoneIcon = document.getElementById("milestone-icon");
const milestoneTitle = document.getElementById("milestone-title");
const milestoneDesc = document.getElementById("milestone-desc");
const milestoneTag = document.getElementById("milestone-tag");

// Overlay Elements
const overlay = document.getElementById("game-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayMode = document.getElementById("overlay-mode");
const overlayScore = document.getElementById("overlay-score");
const overlayTime = document.getElementById("overlay-time");
const overlaySpeed = document.getElementById("overlay-speed");
const overlayRecordTag = document.getElementById("overlay-record-tag");
const overlayPlayBtn = document.getElementById("overlay-play-btn");
const overlayCloseBtn = document.getElementById("overlay-close-btn");

// Web Audio API for synthetic sound effects without external assets
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === "good-drop") {
      // Pleasant water pop/plop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "bad-drop") {
      // Low buzz / splash warning sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === "milestone") {
      // Bright chime for every 10 points
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } else if (type === "gameover") {
      // Gentle closing sequence
      const notes = [440, 392, 349.23];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.15, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.26);
      });
    }
  } catch {
    // Audio context may fail if user has not interacted yet; safe fallback
  }
}

// Math for Exponential droplet fall speed and spawn frequency
function calculateFallDuration(seconds, config) {
  // Speed multiplier v(t) = e^(k * t)
  // Fall duration D(t) = baseDuration / v(t) = baseDuration * e^(-k * t)
  const duration = config.baseDuration * Math.exp(-config.exponentialK * seconds);
  return Math.max(config.minDuration, duration);
}

function calculateSpawnInterval(seconds, config) {
  // Intervals shrink exponentially as spawn rate increases
  const interval = config.baseInterval * Math.exp(-config.intervalDecayK * seconds);
  return Math.max(config.minInterval, Math.round(interval));
}

function calculateSpeedMultiplier(seconds, config) {
  const currentDuration = calculateFallDuration(seconds, config);
  // Speed multiplier relative to base duration of chosen difficulty
  return config.baseDuration / currentDuration;
}

// High score handling
function getHighScore(mode) {
  try {
    const val = localStorage.getItem(`waterdrop_highscore_${mode}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(mode, newScore) {
  try {
    const current = getHighScore(mode);
    if (newScore > current) {
      localStorage.setItem(`waterdrop_highscore_${mode}`, newScore.toString());
      return true;
    }
  } catch {
    // localStorage may be unavailable
  }
  return false;
}

function updateHighScoreDisplay() {
  const config = DIFFICULTIES[currentDifficulty];
  highScoreModeDisplay.textContent = config.name;
  highScoreDisplay.textContent = getHighScore(currentDifficulty);
}

// Difficulty switching
function setDifficulty(mode, restartIfRunning = true) {
  if (!DIFFICULTIES[mode]) return;
  currentDifficulty = mode;
  const config = DIFFICULTIES[mode];

  // Update button active states and aria attributes
  difficultyButtons.forEach((btn) => {
    const isSelected = btn.getAttribute("data-mode") === mode;
    btn.classList.toggle("active", isSelected);
    btn.setAttribute("aria-checked", isSelected ? "true" : "false");
  });

  // Update info description
  if (difficultyDesc) {
    difficultyDesc.innerHTML = config.description;
  }

  // Update high score display for the new difficulty
  updateHighScoreDisplay();

  // If game is active, adjust current run or reset
  if (gameRunning) {
    if (restartIfRunning) {
      stopGame(false);
      startGame();
    } else {
      // Dynamically recalculate current speed and intervals on the fly
      updateSpeedGauge();
      resetDropInterval();
    }
  } else {
    updateSpeedGauge();
  }
}

// Event Listeners for Difficulty Buttons
difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    if (mode) {
      setDifficulty(mode, gameRunning);
    }
  });
});

// Sound button toggle
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "🔊" : "🔇";
  soundButton.title = soundEnabled ? "Sound: On" : "Sound: Muted";
  try {
    localStorage.setItem("waterdrop_sound", soundEnabled ? "1" : "0");
  } catch {
    // ignore
  }
});

// Bucket pointer movement
gameContainer.addEventListener("pointermove", moveBucketPointer);
gameContainer.addEventListener("pointerdown", (event) => {
  getAudioContext();
  moveBucketPointer(event);
});

function moveBucketPointer(event) {
  const bounds = gameContainer.getBoundingClientRect();
  const halfWidth = bucket.offsetWidth / 2;
  const pointerX = event.clientX - bounds.left;
  const clampedX = Math.min(Math.max(pointerX, halfWidth), gameContainer.clientWidth - halfWidth);

  bucketX = clampedX;
  bucket.style.left = `${clampedX}px`;
}

// Keyboard controls (Arrow keys and A/D)
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    keyState.left = true;
    startKeyboardMove();
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    keyState.right = true;
    startKeyboardMove();
  } else if (event.key === " " && event.target.tagName !== "BUTTON") {
    event.preventDefault();
    toggleGame();
  } else if (event.key === "1") {
    setDifficulty("easy", gameRunning);
  } else if (event.key === "2") {
    setDifficulty("normal", gameRunning);
  } else if (event.key === "3") {
    setDifficulty("hard", gameRunning);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    keyState.left = false;
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    keyState.right = false;
  }
  if (!keyState.left && !keyState.right) {
    stopKeyboardMove();
  }
});

function startKeyboardMove() {
  if (isKeyboardMoving) return;
  isKeyboardMoving = true;

  function step() {
    if (!keyState.left && !keyState.right) {
      isKeyboardMoving = false;
      return;
    }

    const bounds = gameContainer.getBoundingClientRect();
    const halfWidth = bucket.offsetWidth / 2;
    if (bucketX === null) {
      bucketX = bounds.width / 2;
    }

    const moveSpeed = 16;
    if (keyState.left) bucketX -= moveSpeed;
    if (keyState.right) bucketX += moveSpeed;

    bucketX = Math.min(Math.max(bucketX, halfWidth), bounds.width - halfWidth);
    bucket.style.left = `${bucketX}px`;

    keyMoveRaf = requestAnimationFrame(step);
  }

  keyMoveRaf = requestAnimationFrame(step);
}

function stopKeyboardMove() {
  isKeyboardMoving = false;
  if (keyMoveRaf) cancelAnimationFrame(keyMoveRaf);
}

// Catch drop mechanism (unified for bucket collision and direct clicks)
function catchDrop(drop, clientX, clientY) {
  if (!drop || drop.dataset.caught === "true") return;
  drop.dataset.caught = "true";

  const isBad = drop.classList.contains("bad-drop");
  const dropBounds = drop.getBoundingClientRect();
  const containerBounds = gameContainer.getBoundingClientRect();

  const effectX = (clientX !== undefined ? clientX : dropBounds.left + dropBounds.width / 2) - containerBounds.left;
  const effectY = (clientY !== undefined ? clientY : dropBounds.top + dropBounds.height / 2) - containerBounds.top;

  drop.remove();

  if (isBad) {
    score = Math.max(0, score - 1);
    playSound("bad-drop");
    createFloatingText("-1", effectX, effectY, "bad");
    triggerBucketShake();
  } else {
    score += 1;
    dropsCaught += 1;
    playSound("good-drop");
    createFloatingText("+1", effectX, effectY, "good");
    createSplashRing(effectX, effectY);

    // Trigger milestone message every time score increases by 10 points
    const currentMilestoneTier = Math.floor(score / 10) * 10;
    if (currentMilestoneTier >= 10 && currentMilestoneTier > lastMilestoneReached) {
      lastMilestoneReached = currentMilestoneTier;
      triggerMilestone(currentMilestoneTier);
    }
  }

  scoreDisplay.textContent = score;

  // Real-time high score check
  const currentBest = getHighScore(currentDifficulty);
  if (score > currentBest) {
    highScoreDisplay.textContent = score;
  }
}

// Check for collision between bucket and drops
function collectDrops() {
  const bucketBounds = bucket.getBoundingClientRect();

  document.querySelectorAll(".water-drop").forEach((drop) => {
    if (drop.dataset.caught === "true") return;

    const dropBounds = drop.getBoundingClientRect();
    const overlaps =
      bucketBounds.left < dropBounds.right &&
      bucketBounds.right > dropBounds.left &&
      bucketBounds.top < dropBounds.bottom &&
      bucketBounds.bottom > dropBounds.top;

    if (overlaps) {
      catchDrop(drop);
    }
  });
}

function checkForCaughtDrops() {
  if (!gameRunning) return;
  collectDrops();
  requestAnimationFrame(checkForCaughtDrops);
}

// Floating score feedback text
function createFloatingText(text, x, y, type) {
  const floatEl = document.createElement("div");
  floatEl.className = `floating-feedback ${type}`;
  floatEl.textContent = text;
  floatEl.style.left = `${x}px`;
  floatEl.style.top = `${y}px`;
  visualEffectsLayer.appendChild(floatEl);

  floatEl.addEventListener("animationend", () => {
    floatEl.remove();
  });
}

// Splash ring visual effect
function createSplashRing(x, y) {
  const ring = document.createElement("div");
  ring.className = "splash-ring";
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  visualEffectsLayer.appendChild(ring);

  ring.addEventListener("animationend", () => {
    ring.remove();
  });
}

// Shake bucket when catching bad drops
function triggerBucketShake() {
  bucket.classList.remove("bucket-hit-bad");
  void bucket.offsetWidth; // Trigger reflow
  bucket.classList.add("bucket-hit-bad");
  setTimeout(() => bucket.classList.remove("bucket-hit-bad"), 300);
}

// Confetti burst for milestone celebration
function createConfetti() {
  const colors = ["#ffc907", "#2e9df7", "#4fcb53", "#ff902a", "#f16061"];

  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    visualEffectsLayer.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

// Milestone celebration banner trigger
function triggerMilestone(tier) {
  const data = getMilestoneData(tier);
  if (!milestoneBanner) return;

  milestoneIcon.textContent = data.icon;
  milestoneTitle.textContent = data.title;
  milestoneDesc.textContent = data.desc;
  milestoneTag.textContent = data.tag;

  playSound("milestone");
  createConfetti();

  milestoneBanner.classList.remove("hidden");
  milestoneBanner.classList.remove("milestone-exit");
  void milestoneBanner.offsetWidth; // Force reflow
  milestoneBanner.classList.add("milestone-enter");

  if (milestoneTimeout) clearTimeout(milestoneTimeout);
  milestoneTimeout = setTimeout(() => {
    milestoneBanner.classList.add("milestone-exit");
    setTimeout(() => {
      milestoneBanner.classList.add("hidden");
      milestoneBanner.classList.remove("milestone-enter", "milestone-exit");
    }, 450);
  }, 3200);
}

function hideMilestone() {
  if (milestoneTimeout) clearTimeout(milestoneTimeout);
  if (milestoneBanner) {
    milestoneBanner.classList.add("hidden");
    milestoneBanner.classList.remove("milestone-enter", "milestone-exit");
  }
}

// Start, Stop, and Reset Game controls
startButton.addEventListener("click", toggleGame);
resetButton.addEventListener("click", resetGame);

overlayPlayBtn.addEventListener("click", () => {
  hideOverlay();
  startGame();
});

overlayCloseBtn.addEventListener("click", () => {
  hideOverlay();
});

function toggleGame() {
  getAudioContext();
  if (gameRunning) {
    stopGame(true);
  } else {
    startGame();
  }
}

function startGame() {
  hideOverlay();
  hideMilestone();
  lastMilestoneReached = 0;
  gameRunning = true;
  elapsedSeconds = 0;
  score = 0;
  dropsCaught = 0;
  peakSpeedMultiplier = 1.0;

  scoreDisplay.textContent = score;
  timeDisplay.textContent = elapsedSeconds;
  updateSpeedGauge();
  updateHighScoreDisplay();

  startButton.textContent = "Stop Game";
  startButton.classList.add("is-stop");
  resetButton.hidden = true;

  // Clear existing drops and particles
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
  visualEffectsLayer.innerHTML = "";

  const config = DIFFICULTIES[currentDifficulty];
  const initialInterval = calculateSpawnInterval(0, config);

  // Set interval to spawn drops
  resetDropMaker(initialInterval);

  // Clock ticks every 1 second
  clearInterval(gameClock);
  gameClock = setInterval(updateGameClock, 1000);

  // Start collision detection loop
  requestAnimationFrame(checkForCaughtDrops);
}

function updateGameClock() {
  if (!gameRunning) return;
  elapsedSeconds += 1;
  timeDisplay.textContent = elapsedSeconds;

  updateSpeedGauge();
  resetDropInterval();
}

function updateSpeedGauge() {
  const config = DIFFICULTIES[currentDifficulty];
  const mult = calculateSpeedMultiplier(elapsedSeconds, config);
  if (mult > peakSpeedMultiplier) {
    peakSpeedMultiplier = mult;
  }

  speedDisplay.textContent = `${mult.toFixed(2)}x`;

  // Pulse effect when speed increases significantly
  if (elapsedSeconds > 0 && elapsedSeconds % 5 === 0) {
    speedDisplay.classList.remove("speed-pulse");
    void speedDisplay.offsetWidth;
    speedDisplay.classList.add("speed-pulse");
  }
}

function resetDropInterval() {
  const config = DIFFICULTIES[currentDifficulty];
  const newInterval = calculateSpawnInterval(elapsedSeconds, config);
  resetDropMaker(newInterval);
}

function resetDropMaker(interval) {
  clearInterval(dropMaker);
  if (gameRunning) {
    dropMaker = setInterval(createDrop, interval);
  }
}

function stopGame(showSummary = true) {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameClock);

  startButton.textContent = "Start Game";
  startButton.classList.remove("is-stop");
  resetButton.hidden = false;

  const isNewRecord = saveHighScore(currentDifficulty, score);
  updateHighScoreDisplay();

  if (showSummary) {
    playSound("gameover");
    showOverlay(isNewRecord);
  }
}

function resetGame() {
  stopGame(false);
  hideMilestone();
  lastMilestoneReached = 0;
  score = 0;
  elapsedSeconds = 0;
  dropsCaught = 0;
  peakSpeedMultiplier = 1.0;

  scoreDisplay.textContent = score;
  timeDisplay.textContent = elapsedSeconds;
  updateSpeedGauge();
  resetButton.hidden = true;

  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
  visualEffectsLayer.innerHTML = "";
  hideOverlay();
}

// Show End Game / Performance Summary Modal
function showOverlay(isNewRecord) {
  const config = DIFFICULTIES[currentDifficulty];
  overlayMode.textContent = config.name;
  overlayMode.style.color = config.color;
  overlayScore.textContent = score;
  overlayTime.textContent = `${elapsedSeconds}s`;
  overlaySpeed.textContent = `${peakSpeedMultiplier.toFixed(2)}x`;

  if (score >= 20) {
    overlayTitle.textContent = "Victory!";
    overlayMessage.textContent = WINNING_MESSAGES[Math.floor(Math.random() * WINNING_MESSAGES.length)];
  } else {
    overlayTitle.textContent = "Game Complete";
    overlayMessage.textContent = TRY_AGAIN_MESSAGES[Math.floor(Math.random() * TRY_AGAIN_MESSAGES.length)];
  }

  if (isNewRecord && score > 0) {
    overlayRecordTag.classList.remove("hidden");
  } else {
    overlayRecordTag.classList.add("hidden");
  }

  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

// Drop creation with exponential fall speed
function createDrop() {
  if (!gameRunning) return;

  const config = DIFFICULTIES[currentDifficulty];
  const drop = document.createElement("div");

  const isBadDrop = Math.random() < config.badDropChance;
  drop.className = isBadDrop ? "water-drop bad-drop" : "water-drop";

  // Visual size variety
  const initialSize = 56;
  const sizeMultiplier = Math.random() * 0.7 + 0.65;
  const size = Math.round(initialSize * sizeMultiplier);
  drop.style.width = `${size}px`;
  drop.style.height = `${size}px`;

  // Random horizontal position within the container bounds
  const gameWidth = gameContainer.offsetWidth || 800;
  const maxLeft = Math.max(0, gameWidth - size - 10);
  const xPosition = Math.random() * maxLeft;
  drop.style.left = `${xPosition}px`;

  // Calculate exponential fall duration for this drop
  const fallDuration = calculateFallDuration(elapsedSeconds, config);
  drop.style.animationDuration = `${fallDuration.toFixed(3)}s`;

  // Allow clicking / tapping drop directly to catch
  drop.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    catchDrop(drop, event.clientX, event.clientY);
  });

  // Append to container
  gameContainer.appendChild(drop);

  // Clean up drops that finish falling without being caught
  drop.addEventListener("animationend", () => {
    drop.remove();
  });
}

// Initialize on page load
function initialize() {
  try {
    const savedSound = localStorage.getItem("waterdrop_sound");
    if (savedSound === "0") {
      soundEnabled = false;
      soundButton.textContent = "🔇";
      soundButton.title = "Sound: Muted";
    }
  } catch {
    // ignore
  }

  setDifficulty("normal", false);
  updateSpeedGauge();
  updateHighScoreDisplay();
}

initialize();
