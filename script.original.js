// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let gameClock;
let elapsedSeconds = 0;
let dropInterval = 1000;
let score = 0;

const gameContainer = document.getElementById("game-container");
const bucket = document.getElementById("bucket");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");

gameContainer.addEventListener("pointermove", moveBucket);
gameContainer.addEventListener("pointerenter", moveBucket);

function moveBucket(event) {
  const bounds = gameContainer.getBoundingClientRect();
  const halfWidth = bucket.offsetWidth / 2;
  const pointerX = event.clientX - bounds.left - gameContainer.clientLeft;
  const x = Math.min(Math.max(pointerX, halfWidth), gameContainer.clientWidth - halfWidth);

  bucket.style.left = `${x}px`;
}

function collectDrops() {
  const bucketBounds = bucket.getBoundingClientRect();

  document.querySelectorAll(".water-drop").forEach((drop) => {
    const dropBounds = drop.getBoundingClientRect();
    const overlaps = bucketBounds.left < dropBounds.right
      && bucketBounds.right > dropBounds.left
      && bucketBounds.top < dropBounds.bottom
      && bucketBounds.bottom > dropBounds.top;

    if (overlaps) {
      drop.remove();
      if (drop.classList.contains("bad-drop")) {
        score = Math.max(0, score - 1);
      } else {
        score += 1;
        if (score % 10 === 0) createConfetti();
      }
      scoreDisplay.textContent = score;
    }
  });
}

startButton.addEventListener("click", toggleGame);
resetButton.addEventListener("click", resetGame);

function toggleGame() {
  if (gameRunning) {
    stopGame();
  } else {
    startGame();
  }
}

function startGame() {
  gameRunning = true;
  elapsedSeconds = 0;
  dropInterval = 1000;
  timeDisplay.textContent = elapsedSeconds;
  startButton.textContent = "Stop Game";
  startButton.classList.add("is-stop");
  resetButton.hidden = true;

  dropMaker = setInterval(createDrop, dropInterval);
  gameClock = setInterval(updateGameClock, 1000);
  requestAnimationFrame(checkForCaughtDrops);
}

function updateGameClock() {
  elapsedSeconds += 1;
  timeDisplay.textContent = elapsedSeconds;

  if (elapsedSeconds % 10 === 0) {
    dropInterval = Math.max(500, dropInterval - 50);
    clearInterval(dropMaker);
    dropMaker = setInterval(createDrop, dropInterval);
  }
}

function createConfetti() {
  const colors = ["#ffc907", "#2e9df7", "#4fcb53", "#ff902a", "#f16061"];

  for (let index = 0; index < 24; index += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    gameContainer.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function stopGame() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameClock);
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
  gameContainer.querySelectorAll(".confetti-piece").forEach((piece) => piece.remove());
  startButton.textContent = "Start Game";
  startButton.classList.remove("is-stop");
  resetButton.hidden = false;
}

function resetGame() {
  score = 0;
  elapsedSeconds = 0;
  dropInterval = 1000;
  scoreDisplay.textContent = score;
  timeDisplay.textContent = elapsedSeconds;
  resetButton.hidden = true;
}

function checkForCaughtDrops() {
  if (!gameRunning) return;

  collectDrops();
  requestAnimationFrame(checkForCaughtDrops);
}

function createDrop() {
  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  const isBadDrop = Math.random() < 0.25;
  drop.className = isBadDrop ? "water-drop bad-drop" : "water-drop";

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  const fallDuration = Math.max(2, 4 - Math.floor(elapsedSeconds / 10) * 0.2);
  drop.style.animationDuration = `${fallDuration}s`;

  // Add the new drop to the game screen
  document.getElementById("game-container").appendChild(drop);

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
}
