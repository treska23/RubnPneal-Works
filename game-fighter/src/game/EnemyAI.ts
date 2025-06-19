// game-fighter/src/game/EnemyAI.ts
export type EnemyDecision = "chase" | "attack" | "jump";

/**
 * Devuelve la acción del enemigo según la distancia al jugador.
 * No usa llamadas en red y nunca lanza excepciones.
 */
export async function requestEnemyAction(ctx: {
  distance: number;
}): Promise<EnemyDecision> {
  const { distance } = ctx;

  if (distance < 60) {
    return "attack";
  }

  if (distance < 140) {
    return Math.random() < 0.15 ? "jump" : "chase";
  }

  return "chase";
}
