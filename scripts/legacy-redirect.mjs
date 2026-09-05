const CURRENT_ORIGIN = 'https://rubnpneal-works.treska23.workers.dev';

export default {
  fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(CURRENT_ORIGIN);
    target.pathname = incoming.pathname;
    target.search = incoming.search;
    return new Response(null, {
      status: 308,
      headers: {
        Location: target.href,
        'Cache-Control': incoming.pathname.startsWith('/api/') || incoming.search
          ? 'no-store'
          : 'public, max-age=300',
      },
    });
  },
};
