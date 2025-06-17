// game-fighter/src/game/EnemyAI.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  // Si usas NEXT-JS/Node ≥18 no hace falta fetch polyfill
  // La clave se toma de process.env.OPENAI_API_KEY
});

/**  
 * ID de tu modelo fine-tune.  
 *  – Guárdalo en la variable de entorno  `OPENAI_FT_MODEL`  
 *  – ó pon aquí el literal, p. ej.  
OPENAI_FT_MODEL=ft:gpt-3.5-turbo-0613:rubnpneal/enemy-bison:2024-03-29
 */
const FT_MODEL = process.env.OPENAI_FT_MODEL ?? '';

export type EnemyDecision = 'chase' | 'attack' | 'jump';

/**
 * Consulta al modelo fine-tune y devuelve la acción para el enemigo.
 * Devuelve siempre 'chase' si no hay modelo o API-key configurados.
 */
export async function requestEnemyAction(ctx: { distance: number }): Promise<EnemyDecision> {
  // ── Comprobaciones mínimas ───────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY no configurada → fallback "chase"');
    return 'chase';
  }
  if (!FT_MODEL) {
    console.warn('OPENAI_FT_MODEL no configurado → fallback "chase"');
    return 'chase';
  }

  // ── Llamada al modelo fine-tune ──────────────────────────────
  try {
    const { choices } = await openai.chat.completions.create({
      model: FT_MODEL, // ← tu fine-tune
      temperature: 0.2, // queremos respuestas estables
      max_tokens: 1, // solo “attack/jump/chase”
      messages: [
        // Tu fine-tune ya sabe el contexto; solo pásale el estado
        {
          role: 'user',
          content: String(Math.round(ctx.distance)), // ej. “180”
        },
      ],
    });

    const decision = choices[0]?.message?.content?.trim().toLowerCase();
    switch (decision) {
      case 'attack':
      case 'jump':
      case 'chase':
        return decision;
      default:
        console.warn('Respuesta inesperada:', decision);
        return 'chase';
    }
  } catch (err) {
    console.error('OpenAI request failed → fallback "chase"', err);
    return 'chase';
  }
}
