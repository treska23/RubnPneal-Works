import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

type Summary = {
  periodDays: number;
  generatedAt: string;
  totals: { visits: number; pageViews: number };
  devices: { desktop: number; mobile: number };
  pages: Array<{ path: string; views: number }>;
  referrers: Array<{ host: string; views: number }>;
  daily: Array<{ date: string; visits: number; pageViews: number }>;
};

const ranges = [
  { days: 1, label: '24 horas' },
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
];

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-white/45">{detail}</p> : null}
    </div>
  );
}

function RankedList({
  rows,
  emptyText,
}: {
  rows: Array<{ label: string; value: number }>;
  emptyText: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) return <p className="text-sm text-white/40">{emptyText}</p>;

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
            <span className="min-w-0 truncate text-white/75">{row.label}</span>
            <span className="shrink-0 font-medium text-white">{row.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/70"
              style={{ width: `${Math.max((row.value / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/analytics-summary?days=${days}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Analytics request failed');
        return (await response.json()) as Summary;
      })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const pagesPerVisit = useMemo(() => {
    if (!summary?.totals.visits) return '0';
    return (summary.totals.pageViews / summary.totals.visits).toFixed(1);
  }, [summary]);

  const totalDevices = (summary?.devices.desktop ?? 0) + (summary?.devices.mobile ?? 0);
  const desktopPct = totalDevices
    ? Math.round(((summary?.devices.desktop ?? 0) / totalDevices) * 100)
    : 0;
  const mobilePct = totalDevices ? 100 - desktopPct : 0;

  return (
    <>
      <Head>
        <title>Analytics | RubnPneal Works</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <section className="min-h-screen bg-[#090909] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/35">RubnPneal Works</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Estadísticas</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/45">
                Visitas reales del portfolio. Esta página no se cuenta a sí misma.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {ranges.map((range) => (
                <button
                  key={range.days}
                  type="button"
                  onClick={() => setDays(range.days)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    days === range.days
                      ? 'border-white bg-white text-black'
                      : 'border-white/15 bg-white/[0.03] text-white/65 hover:border-white/35'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-white/45">
              Cargando estadísticas…
            </div>
          ) : error || !summary ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-white/60">
              No se han podido cargar las estadísticas.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Visitas" value={String(summary.totals.visits)} detail="Sesiones nuevas" />
                <StatCard label="Páginas vistas" value={String(summary.totals.pageViews)} />
                <StatCard label="Páginas por visita" value={pagesPerVisit} />
                <StatCard
                  label="Dispositivo"
                  value={`${desktopPct}% PC`}
                  detail={`${mobilePct}% móvil`}
                />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h2 className="mb-5 text-lg font-medium">Páginas más vistas</h2>
                  <RankedList
                    rows={summary.pages.map((row) => ({ label: row.path, value: row.views }))}
                    emptyText="Todavía no hay páginas vistas en este periodo."
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h2 className="mb-5 text-lg font-medium">Origen del tráfico</h2>
                  <RankedList
                    rows={summary.referrers.map((row) => ({ label: row.host, value: row.views }))}
                    emptyText="Aún no hay referencias externas registradas."
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-5 text-lg font-medium">Actividad por día</h2>
                {summary.daily.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="text-white/35">
                        <tr className="border-b border-white/10">
                          <th className="pb-3 font-normal">Fecha</th>
                          <th className="pb-3 text-right font-normal">Visitas</th>
                          <th className="pb-3 text-right font-normal">Páginas vistas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.daily
                          .slice()
                          .reverse()
                          .map((row) => (
                            <tr key={row.date} className="border-b border-white/5 last:border-0">
                              <td className="py-3 text-white/70">{row.date}</td>
                              <td className="py-3 text-right text-white">{row.visits}</td>
                              <td className="py-3 text-right text-white">{row.pageViews}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-white/40">Todavía no hay actividad guardada.</p>
                )}
              </div>

              <p className="mt-5 text-xs text-white/25">
                Datos guardados desde la activación del histórico. Actualizado: {' '}
                {new Date(summary.generatedAt).toLocaleString('es-ES')}.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
