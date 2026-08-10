/**
 * Registers the service worker that makes the app work offline.
 *
 * Only in a production build over a secure context: the dev server has no
 * `sw.js` to register, and a service worker caching a dev build would be an
 * excellent way to spend an afternoon debugging a stale chart.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  const base = import.meta.env.BASE_URL;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // No offline support this run. The app still works over the network, so
      // there is nothing worth interrupting the user for.
    });
  });
}
