import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (error: unknown) => void;
      }) => {
        render: (container: HTMLElement) => Promise<void>;
        close?: () => Promise<void>;
      };
    };
  }
}

const STORAGE_KEY = 'comic-hd-access-token';

function getAccessUrl(token: string) {
  return `/api/comic/download?token=${encodeURIComponent(token)}`;
}

export default function ComicPurchase() {
  const paypalContainer = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    const storedToken = window.localStorage.getItem(STORAGE_KEY);
    if (storedToken) setAccessToken(storedToken);

    let cancelled = false;

    async function loadPayPal() {
      try {
        const configResponse = await fetch('/api/comic/paypal-client-id', {
          cache: 'no-store',
        });
        if (!configResponse.ok) throw new Error('PayPal no está configurado.');
        const { clientId } = (await configResponse.json()) as { clientId: string };

        if (!window.paypal) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(
              'script[data-comic-paypal="true"]',
            );
            if (existing) {
              existing.addEventListener('load', () => resolve(), { once: true });
              existing.addEventListener('error', () => reject(new Error('PayPal SDK error')), {
                once: true,
              });
              return;
            }

            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture`;
            script.async = true;
            script.dataset.comicPaypal = 'true';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('No se pudo cargar PayPal.'));
            document.head.appendChild(script);
          });
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('No se pudo cargar el pago con PayPal.');
      }
    }

    loadPayPal();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !paypalContainer.current || !window.paypal) return;

    paypalContainer.current.innerHTML = '';
    const buttons = window.paypal.Buttons({
      createOrder: async () => {
        setError('');
        const response = await fetch('/api/comic/create-order', { method: 'POST' });
        const data = (await response.json()) as { id?: string; error?: string };
        if (!response.ok || !data.id) {
          throw new Error(data.error || 'No se pudo crear el pedido.');
        }
        return data.id;
      },
      onApprove: async ({ orderID }) => {
        const response = await fetch('/api/comic/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderID }),
        });
        const data = (await response.json()) as { token?: string; error?: string };
        if (!response.ok || !data.token) {
          throw new Error(data.error || 'No se pudo confirmar el pago.');
        }

        window.localStorage.setItem(STORAGE_KEY, data.token);
        setAccessToken(data.token);
      },
      onError: (err) => {
        console.error('PayPal checkout error', err);
        setError('El pago no pudo completarse. Inténtalo de nuevo.');
      },
    });

    buttons.render(paypalContainer.current).catch((err) => {
      console.error(err);
      setError('No se pudo mostrar el botón de PayPal.');
    });

    return () => {
      buttons.close?.().catch(() => undefined);
    };
  }, [ready]);

  return (
    <section className="mt-10 flex justify-end border-t border-black/15 pt-7 sm:mt-12 sm:pt-8">
      <div className="w-full max-w-md text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
          Edición digital HD
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
          Consigue el cómic completo
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/55">
          PDF de alta calidad. Pago único de 4 € con PayPal.
        </p>

        <div className="mx-auto mt-5 max-w-sm border border-black/15 bg-white/55 p-4">
          <div className="mb-4 flex items-end justify-between gap-4 border-b border-black/10 pb-3 text-left">
            <span className="text-xs font-medium text-black/55">PDF HD</span>
            <span className="text-2xl font-semibold tracking-[-0.04em]">4 €</span>
          </div>

          {accessToken ? (
            <div>
              <p className="mb-3 text-sm leading-6 text-black/60">
                Pago confirmado. Tu acceso HD está desbloqueado en este navegador.
              </p>
              <a
                href={getAccessUrl(accessToken)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 w-full items-center justify-center bg-black px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
              >
                Abrir PDF HD
              </a>
            </div>
          ) : (
            <>
              <div ref={paypalContainer} className="min-h-11" />
              {!ready && !error && (
                <p className="text-xs text-black/50">Cargando PayPal…</p>
              )}
            </>
          )}

          {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
        </div>
      </div>
    </section>
  );
}
