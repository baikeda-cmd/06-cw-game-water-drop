export interface DropItem {
  id: number;
  x: number;
  size: number;
  isBad: boolean;
  fallDuration: number;
  createdAt: number;
}

export interface ConfettiItem {
  id: number;
  x: number;
  color: string;
  duration: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  elapsedSeconds: number;
  goodCaught: number;
  badCaught: number;
}
