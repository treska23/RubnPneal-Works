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
    <section className="flex h-full w-full flex-col justify-center text-center lg:px-6 xl:px-10">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
          Edición en alta definición
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Accede al cómic en alta definición
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-black/55">
          El cómic que estás leyendo es la versión optimizada para web. Aporta la
          cantidad que quieras y accede al PDF en alta definición.
        </p>

        <div className="mt-7 w-full border border-black/15 bg-white/55 p-5 sm:p-6">
          {accessToken ? (
            <div>
              <p className="mb-4 text-sm leading-6 text-black/60">
                Pago confirmado. El PDF en alta definición está desbloqueado en este
                navegador.
              </p>
              <a
                href={getAccessUrl(accessToken)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 w-full items-center justify-center bg-black px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
              >
                Abrir PDF en alta definición
              </a>
            </div>
          ) : (
            <>
              <label
                htmlFor="comic-contribution"
                className="block text-xs font-semibold uppercase tracking-[0.12em] text-black/50"
              >
                Aporta lo que quieras
              </label>
              <div className="mx-auto mt-3 flex h-12 max-w-[220px] items-center border border-black/20 bg-white px-4">
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
                  className="min-w-0 flex-1 bg-transparent text-right text-xl font-semibold outline-none"
                />
                <span className="ml-2 text-lg font-semibold text-black/55">€</span>
              </div>

              <div className="mx-auto mt-5 max-w-md">
                <div ref={paypalContainer} className="min-h-10" />
                {!ready && !error && (
                  <p className="text-sm text-black/45">Cargando PayPal…</p>
                )}
                {ready && !payableAmount && !error && (
                  <p className="text-sm leading-5 text-black/45">
                    Introduce una cantidad para continuar.
                  </p>
                )}
              </div>
            </>
          )}

          {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
        </div>
      </div>
    </section>
  );
}
