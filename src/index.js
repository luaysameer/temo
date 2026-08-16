export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const url = new URL(request.url);
    const path = url.pathname;

    // Always revalidate the app shell so the bare workers.dev URL shows the latest UI.
    if (path === '/' || path.endsWith('.html')) {
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    } else if (path.endsWith('.css') || path.endsWith('.js')) {
      headers.set('Cache-Control', 'no-cache, must-revalidate, max-age=0');
    } else if (path.endsWith('.mp4')) {
      headers.set('Cache-Control', 'public, max-age=300, must-revalidate');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
