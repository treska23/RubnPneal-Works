import { useEffect, useMemo, useState } from 'react';

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
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const payableAmount = useMemo(() => normalizeAmount(amount), [amount]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(STORAGE_KEY);
    if (storedToken) setAccessToken(storedToken);

    const params = new URLSearchParams(window.location.search);
    const paypalState = params.get('paypal');
    const orderId = params.get('token');

    if (paypalState === 'cancel') {
      setError('El pago se ha cancelado.');
      window.history.replaceState({}, '', '/comic');
      return;
    }

    if (paypalState !== 'return' || !orderId || storedToken) return;

    let cancelled = false;

    async function confirmPayment() {
      setProcessing(true);
      setError('');

      try {
        const response = await fetch('/api/comic/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const data = (await response.json()) as {
          token?: string;
          error?: string;
        };

        if (!response.ok || !data.token) {
          throw new Error(data.error || 'No se pudo confirmar el pago.');
        }

        window.localStorage.setItem(STORAGE_KEY, data.token);
        if (!cancelled) setAccessToken(data.token);
      } catch (err) {
        console.error('PayPal capture error', err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'El pago no pudo confirmarse.',
          );
        }
      } finally {
        if (!cancelled) setProcessing(false);
        window.history.replaceState({}, '', '/comic');
      }
    }

    confirmPayment();

    return () => {
      cancelled = true;
    };
  }, []);

  async function startPayPalCheckout() {
    if (!payableAmount) {
      setError('Introduce una cantidad válida para continuar.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/comic/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payableAmount }),
      });
      const data = (await response.json()) as {
        approveUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.approveUrl) {
        throw new Error(data.error || 'No se pudo iniciar el pago.');
      }

      window.location.assign(data.approveUrl);
    } catch (err) {
      console.error('PayPal checkout error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar el pago con PayPal.',
      );
      setProcessing(false);
    }
  }

  return (
    <section
      id="comic-purchase"
      className="flex min-h-[620px] w-full scroll-mt-24 flex-1 items-center justify-center border-y border-black/15 bg-[#ece7dc] px-6 py-10 text-center sm:px-10 lg:min-h-0 lg:px-10 xl:px-14"
    >
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
          Edición en alta definición
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Descarga la novela gráfica en alta definición
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-black/60 sm:text-lg sm:leading-8">
          La novela gráfica completa ya está disponible para leer aquí. Si
          quieres el PDF con mayor definición, aporta la cantidad que quieras y
          desbloquea la edición HD.
        </p>

        <div className="mt-9 w-full border border-black/15 bg-white/65 p-6 sm:p-8">
          {accessToken ? (
            <div>
              <p className="mb-5 text-base leading-7 text-black/60">
                Pago confirmado. La edición HD está desbloqueada en este
                navegador.
              </p>
              <a
                href={getAccessUrl(accessToken)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-14 w-full items-center justify-center bg-black px-6 py-4 text-sm font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
              >
                Abrir PDF en alta definición
              </a>
            </div>
          ) : (
            <>
              <label
                htmlFor="comic-contribution"
                className="block text-sm font-semibold uppercase tracking-[0.12em] text-black/55"
              >
                Aporta lo que quieras
              </label>
              <div className="mx-auto mt-4 flex h-14 max-w-[280px] items-center border border-black/20 bg-white px-5">
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
                  className="min-w-0 flex-1 bg-transparent text-right text-2xl font-semibold outline-none"
                />
                <span className="ml-2 text-xl font-semibold text-black/55">
                  €
                </span>
              </div>

              <button
                type="button"
                onClick={startPayPalCheckout}
                disabled={!payableAmount || processing}
                className="mt-6 flex min-h-14 w-full items-center justify-center bg-[#ffc439] px-6 py-4 text-base font-semibold text-[#111] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? 'Procesando…' : 'Continuar con PayPal'}
              </button>

              {!payableAmount && !error && !processing && (
                <p className="mt-3 text-sm text-black/45">
                  Elige tu aportación en euros, desde 0,01 €.
                </p>
              )}
            </>
          )}

          {error && (
            <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
