import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DropItem, ConfettiItem } from './types';

const CONFETTI_COLORS = ['#ffc907', '#2e9df7', '#4fcb53', '#ff902a', '#f16061'];

const WINNING_MESSAGES = [
  'Incredible job! You brought clean and safe drinking water to an entire community!',
  "You're a clean water champion! Every drop brings hope and transformation.",
  'Outstanding! You caught 20+ clean drops and made a life-changing splash!',
  'Victory! Your water-catching skills are as refreshing as clean water straight from the tap!',
];

const TRY_AGAIN_MESSAGES = [
  'Keep going! 703 million people lack clean water, and practice makes perfect.',
  'Nice effort! Grab your yellow jerry can and try again to catch at least 20 drops!',
  'Almost there! Dodge the dirty drops and focus on the crystal clear ones.',
  'Don’t give up! Every drop brings us one step closer to ending the water crisis.',
];

// Simple Web Audio API sound synthesizer
function playSound(type: 'catch' | 'bad' | 'celebrate' | 'click', enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'catch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'bad') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'celebrate') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.2);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

interface FloatFeedback {
  id: number;
  text: string;
  x: number;
  y: number;
  isPositive: boolean;
}

export default function App() {
  const [gameRunning, setGameRunning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('cw_high_score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameMode, setGameMode] = useState<'standard' | 'timer30'>('timer30');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [drops, setDrops] = useState<DropItem[]>([]);
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);
  const [floatFeedbacks, setFloatFeedbacks] = useState<FloatFeedback[]>([]);

  const [endGameModal, setEndGameModal] = useState<{
    visible: boolean;
    isWin: boolean;
    title: string;
    message: string;
    finalScore: number;
  }>({
    visible: false,
    isWin: false,
    title: '',
    message: '',
    finalScore: 0,
  });

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const bucketRef = useRef<HTMLImageElement>(null);
  const bucketXRef = useRef<number>(400);

  const nextDropId = useRef<number>(1);
  const nextConfettiId = useRef<number>(1);
  const nextFeedbackId = useRef<number>(1);

  const dropsRef = useRef<DropItem[]>([]);
  dropsRef.current = drops;

  const scoreRef = useRef<number>(score);
  scoreRef.current = score;

  const gameRunningRef = useRef<boolean>(gameRunning);
  gameRunningRef.current = gameRunning;

  const timeRef = useRef<number>(time);
  timeRef.current = time;

  const dropIntervalRef = useRef<number>(1000);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Move bucket with pointer
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = gameContainerRef.current;
    const bucket = bucketRef.current;
    if (!container || !bucket) return;

    const bounds = container.getBoundingClientRect();
    const halfWidth = bucket.offsetWidth / 2;
    const pointerX = e.clientX - bounds.left - container.clientLeft;
    const x = Math.min(Math.max(pointerX, halfWidth), container.clientWidth - halfWidth);

    bucketXRef.current = x;
    bucket.style.left = `${x}px`;
  }, []);

  // Trigger celebration confetti
  const triggerConfetti = useCallback(() => {
    playSound('celebrate', soundEnabledRef.current);
    const newPieces: ConfettiItem[] = [];
    for (let i = 0; i < 24; i++) {
      newPieces.push({
        id: nextConfettiId.current++,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration: 1.2 + Math.random() * 0.8,
      });
    }
    setConfetti((prev) => [...prev, ...newPieces]);
  }, []);

  // Spawn a floating score feedback (+1 / -1)
  const addFloatFeedback = useCallback((text: string, x: number, y: number, isPositive: boolean) => {
    const id = nextFeedbackId.current++;
    setFloatFeedbacks((prev) => [...prev, { id, text, x, y, isPositive }]);
    setTimeout(() => {
      setFloatFeedbacks((prev) => prev.filter((item) => item.id !== id));
    }, 700);
  }, []);

  // Handle catching a drop (either via bucket or click)
  const catchDrop = useCallback((drop: DropItem, catchX?: number, catchY?: number) => {
    // Remove from drops
    setDrops((prev) => prev.filter((d) => d.id !== drop.id));

    const container = gameContainerRef.current;
    const containerWidth = container ? container.clientWidth : 800;
    const feedbackX = catchX ?? Math.min(Math.max(drop.x, 30), containerWidth - 40);
    const feedbackY = catchY ?? (container ? container.clientHeight - 130 : 470);

    if (drop.isBad) {
      playSound('bad', soundEnabledRef.current);
      setScore((prev) => Math.max(0, prev - 1));
      addFloatFeedback('-1', feedbackX, feedbackY, false);
    } else {
      playSound('catch', soundEnabledRef.current);
      addFloatFeedback('+1', feedbackX, feedbackY, true);
      setScore((prev) => {
        const newScore = prev + 1;
        if (newScore > 0 && newScore % 10 === 0) {
          triggerConfetti();
        }
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem('cw_high_score', newScore.toString());
        }
        return newScore;
      });
    }
  }, [addFloatFeedback, highScore, triggerConfetti]);

  // Clean end game routine
  const finishGame = useCallback((finalScore: number) => {
    setGameRunning(false);
    gameRunningRef.current = false;
    setDrops([]);

    const isWin = finalScore >= 20;
    const title = isWin ? 'Outstanding Victory!' : 'Good Effort!';
    const messageArray = isWin ? WINNING_MESSAGES : TRY_AGAIN_MESSAGES;
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];

    if (isWin) {
      triggerConfetti();
    }

    setEndGameModal({
      visible: true,
      isWin,
      title,
      message: randomMessage,
      finalScore,
    });
  }, [triggerConfetti]);

  // Start game
  const startGame = useCallback(() => {
    playSound('click', soundEnabledRef.current);
    setGameRunning(true);
    setScore(0);
    setTime(gameMode === 'timer30' ? 30 : 0);
    dropIntervalRef.current = 1000;
    setDrops([]);
    setConfetti([]);
    setEndGameModal((prev) => ({ ...prev, visible: false }));
  }, [gameMode]);

  // Stop game
  const stopGame = useCallback(() => {
    playSound('click', soundEnabledRef.current);
    const currentScore = scoreRef.current;
    setGameRunning(false);
    gameRunningRef.current = false;
    setDrops([]);

    if (currentScore > 0) {
      const isWin = currentScore >= 20;
      const title = isWin ? 'Game Finished!' : 'Game Over';
      const messageArray = isWin ? WINNING_MESSAGES : TRY_AGAIN_MESSAGES;
      const randomMsg = messageArray[Math.floor(Math.random() * messageArray.length)];
      setEndGameModal({
        visible: true,
        isWin,
        title,
        message: randomMsg,
        finalScore: currentScore,
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    playSound('click', soundEnabledRef.current);
    setScore(0);
    setTime(gameMode === 'timer30' ? 30 : 0);
    dropIntervalRef.current = 1000;
    setDrops([]);
    setConfetti([]);
    setEndGameModal((prev) => ({ ...prev, visible: false }));
  }, [gameMode]);

  // Game clock timer
  useEffect(() => {
    if (!gameRunning) return;

    const timer = setInterval(() => {
      setTime((prevTime) => {
        if (gameMode === 'timer30') {
          const nextTime = prevTime - 1;
          if (nextTime <= 0) {
            clearInterval(timer);
            finishGame(scoreRef.current);
            return 0;
          }
          // Increase drop frequency as countdown runs
          if (nextTime % 5 === 0) {
            dropIntervalRef.current = Math.max(400, dropIntervalRef.current - 60);
          }
          return nextTime;
        } else {
          // Standard endless mode: elapsed seconds count up
          const nextTime = prevTime + 1;
          if (nextTime % 10 === 0) {
            dropIntervalRef.current = Math.max(500, dropIntervalRef.current - 50);
          }
          return nextTime;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameRunning, gameMode, finishGame]);

  // Drop spawner loop
  useEffect(() => {
    if (!gameRunning) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextDrop = () => {
      if (!gameRunningRef.current) return;

      const container = gameContainerRef.current;
      const gameWidth = container ? container.clientWidth : 800;

      const isBad = Math.random() < 0.25;
      const sizeMultiplier = Math.random() * 0.8 + 0.5;
      const size = 60 * sizeMultiplier;
      const x = Math.random() * Math.max(20, gameWidth - size - 10);

      // Fall duration speeds up over time
      const elapsedOrPassed = gameMode === 'timer30' ? 30 - timeRef.current : timeRef.current;
      const fallDuration = Math.max(1.8, 4 - Math.floor(elapsedOrPassed / 8) * 0.3);

      const newDrop: DropItem = {
        id: nextDropId.current++,
        x,
        size,
        isBad,
        fallDuration,
        createdAt: Date.now(),
      };

      setDrops((prev) => [...prev, newDrop]);

      timeoutId = setTimeout(scheduleNextDrop, dropIntervalRef.current);
    };

    timeoutId = setTimeout(scheduleNextDrop, 400);

    return () => clearTimeout(timeoutId);
  }, [gameRunning, gameMode]);

  // Bucket collision detection loop
  useEffect(() => {
    if (!gameRunning) return;

    let animId: number;

    const checkCollisions = () => {
      const bucket = bucketRef.current;
      const container = gameContainerRef.current;

      if (bucket && container && dropsRef.current.length > 0) {
        const bucketRect = bucket.getBoundingClientRect();
        // Slightly generous catch area for great responsiveness
        const catchBox = {
          left: bucketRect.left + 5,
          right: bucketRect.right - 5,
          top: bucketRect.top + 10,
          bottom: bucketRect.bottom,
        };

        const activeDropEls = container.querySelectorAll<HTMLElement>('.water-drop');

        activeDropEls.forEach((el) => {
          const dropId = Number(el.getAttribute('data-drop-id'));
          if (!dropId) return;

          const dropRect = el.getBoundingClientRect();
          const overlaps =
            catchBox.left < dropRect.right &&
            catchBox.right > dropRect.left &&
            catchBox.top < dropRect.bottom &&
            catchBox.bottom > dropRect.top;

          if (overlaps) {
            const dropData = dropsRef.current.find((d) => d.id === dropId);
            if (dropData) {
              catchDrop(dropData, bucketXRef.current, container.clientHeight - 130);
            }
          }
        });
      }

      if (gameRunningRef.current) {
        animId = requestAnimationFrame(checkCollisions);
      }
    };

    animId = requestAnimationFrame(checkCollisions);

    return () => cancelAnimationFrame(animId);
  }, [gameRunning, catchDrop]);

  // Clean up confetti that finished animation
  const handleConfettiEnd = useCallback((id: number) => {
    setConfetti((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Drop animation end (hit bottom without being caught)
  const handleDropEnd = useCallback((id: number) => {
    setDrops((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <div className="game-wrapper">
      <header className="cw-header">
        <img
          src="/img/cw_logo-horizontal.png"
          alt="Charity: water"
          className="cw-logo"
          onError={(e) => {
            // Fallback to square logo if horizontal isn't found
            (e.target as HTMLImageElement).src = '/img/cw_logo.png';
          }}
        />
        <h1 className="game-title">Water Drop</h1>
        <p className="game-tagline">Catch the clean drops, avoid the dirty ones!</p>
      </header>

      <div className="score-panel">
        <div className="stats-group">
          <div className="score">
            Score: <span id="score">{score}</span>
          </div>
          <div className="timer">
            {gameMode === 'timer30' ? 'Time Left: ' : 'Time: '}
            <span id="time">{time}</span>s
          </div>
          {highScore > 0 && <div className="high-score">Best: {highScore}</div>}
        </div>

        <div className="controls-group">
          <button
            id="start-btn"
            className={gameRunning ? 'is-stop' : ''}
            onClick={gameRunning ? stopGame : startGame}
          >
            {gameRunning ? 'Stop Game' : 'Start Game'}
          </button>

          {!gameRunning && (
            <button id="reset-btn" onClick={resetGame}>
              Reset Game
            </button>
          )}

          <button
            type="button"
            className="audio-toggle-btn"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
          </button>
        </div>
      </div>

      <div
        id="game-container"
        ref={gameContainerRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerMove}
      >
        {/* Yellow jerry can / bucket */}
        <img
          id="bucket"
          ref={bucketRef}
          src="/img/water-can.png"
          alt="Water Can"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/img/water-can-transparent.png';
          }}
        />

        {/* Falling water drops */}
        {drops.map((drop) => (
          <div
            key={drop.id}
            data-drop-id={drop.id}
            className={`water-drop ${drop.isBad ? 'bad-drop' : ''}`}
            style={{
              left: `${drop.x}px`,
              width: `${drop.size}px`,
              height: `${drop.size}px`,
              animation: `dropFall ${drop.fallDuration}s linear forwards`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              const container = gameContainerRef.current;
              const bounds = container?.getBoundingClientRect();
              const clickX = bounds ? e.clientX - bounds.left : drop.x;
              const clickY = bounds ? e.clientY - bounds.top : 300;
              catchDrop(drop, clickX, clickY);
            }}
            onAnimationEnd={() => handleDropEnd(drop.id)}
          />
        ))}

        {/* Floating feedback indicators */}
        {floatFeedbacks.map((f) => (
          <span
            key={f.id}
            className={`splash-indicator ${f.isPositive ? 'plus' : 'minus'}`}
            style={{
              left: `${f.x}px`,
              top: `${f.y}px`,
            }}
          >
            {f.text}
          </span>
        ))}

        {/* Confetti pieces */}
        {confetti.map((c) => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{
              left: `${c.x}%`,
              backgroundColor: c.color,
              animationDuration: `${c.duration}s`,
            }}
            onAnimationEnd={() => handleConfettiEnd(c.id)}
          />
        ))}

        {/* End Game Announcement Modal */}
        {endGameModal.visible && (
          <div className="game-announcement">
            <h2 className={`announcement-title ${endGameModal.isWin ? 'win' : 'try-again'}`}>
              {endGameModal.title}
            </h2>
            <p className="announcement-message">{endGameModal.message}</p>
            <div className="announcement-stats">
              Final Score: <strong>{endGameModal.finalScore}</strong>
              {endGameModal.isWin && ' (Goal: 20+ reached! 🎉)'}
            </div>
            <button className="announcement-btn" onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Mode selector & legend */}
      <div className="game-guide">
        <span className="guide-pill">
          <span className="guide-dot good" /> Clean Drop (+1 pt)
        </span>
        <span className="guide-pill">
          <span className="guide-dot bad" /> Dirty Drop (-1 pt)
        </span>
        <span style={{ margin: '0 8px', color: '#555' }}>|</span>
        <span>
          Mode:{' '}
          <button
            type="button"
            disabled={gameRunning}
            onClick={() => {
              const newMode = gameMode === 'timer30' ? 'standard' : 'timer30';
              setGameMode(newMode);
              setTime(newMode === 'timer30' ? 30 : 0);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffc907',
              cursor: gameRunning ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
              fontWeight: 'bold',
              padding: '0 4px',
            }}
          >
            {gameMode === 'timer30' ? '30s Countdown (Target: 20)' : 'Endless Timer'}
          </button>
        </span>
      </div>
    </div>
  );
}
