'use client';

import { useEffect, useState } from 'react';

export interface Score {
  name: string;
  points: number;
}

export default function Leaderboard() {
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('arkanoid-scores');
    let parsed: Score[] = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn('LocalStorage arkanoid-scores corrupto; se reinicia.');
        localStorage.removeItem('arkanoid-scores');
      }
    }
    setScores(parsed);
  }, []);

  return (
    <div className="space-y-2">
      {scores.length === 0 && <p>No hay puntuaciones.</p>}
      {scores.map((s, idx) => (
        <div key={idx} className="flex justify-between">
          <span>{s.name}</span>
          <span>{s.points}</span>
        </div>
      ))}
    </div>
  );
}

export function saveScore(next: Score) {
  const raw = localStorage.getItem('arkanoid-scores');
  let scores: Score[] = [];
  if (raw) {
    try {
      scores = JSON.parse(raw);
    } catch {
      console.warn('LocalStorage arkanoid-scores corrupto; se reinicia.');
      localStorage.removeItem('arkanoid-scores');
    }
  }
  const nextScores = [...scores, next];
  localStorage.setItem('arkanoid-scores', JSON.stringify(nextScores));
}
