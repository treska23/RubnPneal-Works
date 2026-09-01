import { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (error: unknown) => void;
        style?: {
          layout?: 'vertical' | 'horizontal';
          height?: number;
          shape?: 'rect' | 'pill';
          label?: 'paypal' | 'checkout' | 'buynow' | 'pay';
        };
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

function normalizeAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return '';

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 9999.99) return '';

  return amount.toFixed(2);
}

export default function ComicPurchase() {
  const paypalContainer = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [amount, setAmount] = useState('');
  const payableAmount = useMemo(() => normalizeAmount(amount), [amount]);

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
              if (window.paypal) {
                resolve();
                return;
              }
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
    if (!paypalContainer.current) return;
    paypalContainer.current.innerHTML = '';

    if (!ready || !window.paypal || !payableAmount || accessToken) return;

    const buttons = window.paypal.Buttons({
      style: {
        layout: 'vertical',
        height: 38,
        shape: 'rect',
        label: 'paypal',
      },
      createOrder: async () => {
        setError('');
        const response = await fetch('/api/comic/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: payableAmount }),
        });
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
  }, [accessToken, payableAmount, ready]);

  return (
    <section className="w-full max-w-[340px] text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
        Edición digital HD
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
        Consigue el cómic completo
      </h2>
      <p className="mx-auto mt-2 max-w-[290px] text-sm leading-6 text-black/55">
        Tú eliges cuánto aportar. El pago desbloquea el PDF en alta calidad.
      </p>

      <div className="mt-5 border border-black/15 bg-white/55 p-4">
        {accessToken ? (
          <div>
            <p className="mb-3 text-sm leading-6 text-black/60">
              Pago confirmado. El PDF HD está desbloqueado en este navegador.
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
            <label
              htmlFor="comic-contribution"
              className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/50"
            >
              Tú decides el precio
            </label>
            <div className="mx-auto mt-2 flex h-11 max-w-[180px] items-center border border-black/20 bg-white px-3">
              <input
                id="comic-contribution"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^0-9.,]/g, ''));
                  setError('');
                }}
                placeholder="0,00"
                aria-label="Cantidad en euros"
                className="min-w-0 flex-1 bg-transparent text-right text-lg font-semibold outline-none"
              />
              <span className="ml-1.5 text-base font-semibold text-black/55">€</span>
            </div>

            <div className="mt-4">
              <div ref={paypalContainer} className="min-h-10" />
              {!ready && !error && (
                <p className="text-xs text-black/45">Cargando PayPal…</p>
              )}
              {ready && !payableAmount && !error && (
                <p className="text-xs leading-5 text-black/45">
                  Introduce una cantidad para continuar.
                </p>
              )}
            </div>
          </>
        )}

        {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}
      </div>
    </section>
  );
}
