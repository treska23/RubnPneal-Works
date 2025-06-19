// pages/api/enemy-action.ts   (ya lo tienes parecido)
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type EnemyDecision = 'attack' | 'jump' | 'chase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ action: EnemyDecision }>,
) {
  const { distance = 0 } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});

  /* sin clave → “chase” ---------------------------------- */
  if (!openai) return res.status(200).json({ action: 'chase' });

  try {
    const { choices } = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 1,
      messages: [
        {
          role: 'system',
          content: 'Eres la IA de un jefe de beat-em-up. Devuelve SOLO "attack", "jump" o "chase".',
        },
        { role: 'user', content: `Enemy is ${Math.round(distance)} pixels from the player.` },
      ],
    });

    const raw = choices[0]?.message?.content?.trim().toLowerCase() ?? '';
    const action: EnemyDecision =
      (['attack', 'jump', 'chase'] as EnemyDecision[]).find((a) => raw.includes(a)) ?? 'chase';

    return res.status(200).json({ action });
  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ action: 'chase' });
  }
}
