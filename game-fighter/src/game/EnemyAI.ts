// game-fighter/src/game/EnemyAI.ts
export type EnemyDecision = 'chase' | 'attack' | 'jump';

/**
 * Devuelve la acción del enemigo.
 *
 * ▸ Si NO hay OPENAI_API_KEY → lógica local “chase”.
 * ▸ Si hay API-key           → pregunta a GPT-3.5-turbo.
 */
export async function requestEnemyAction(ctx: { distance: number }): Promise<EnemyDecision> {
  try {
    const res = await fetch('/api/enemy-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctx),
    });

    if (!res.ok) throw new Error(`status ${res.status}`);

    const { action } = (await res.json()) as { action: EnemyDecision };
    return action ?? 'chase';
  } catch (err) {
    console.warn('Enemy AI fallback (error)', err);
    return 'chase';
  }
}
