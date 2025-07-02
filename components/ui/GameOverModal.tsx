'use client';

import { Button } from './Button';

interface Props {
  /** Whether the modal should be visible */
  open: boolean;
  /** Callback fired when the user wants to retry the level */
  onRetry: () => void;
  /** Callback fired when the user wants to exit */
  onExit: () => void;
  /** Optional custom title */
  title?: string;
}

export default function GameOverModal({
  open,
  onRetry,
  onExit,
  title = 'Game Over',
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="space-y-4 rounded-lg bg-gray-800 p-6 text-center text-white">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex justify-center gap-4">
          <Button onClick={onRetry}>Reintentar nivel</Button>
          <Button variant="destructive" onClick={onExit}>
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
