// game-fighter/src/game/EnemyAI.ts
export type EnemyDecision = "chase" | "attack" | "jump";

/**
 * Algoritmo local muy simple:
 *   • < 60 px   → attack
 *   • < 140 px  → 15 % jump, 85 % chase
 *   • ≥ 140 px  → chase
 *
 * SIN peticiones de red - jamás lanzará fetch.
 */
export async function requestEnemyAction(ctx: {
  distance: number;
}): Promise<EnemyDecision> {
  const d = ctx.distance;

  if (d < 60) return "attack";
  if (d < 140 && Math.random() < 0.15) return "jump";
  return "chase";
}
