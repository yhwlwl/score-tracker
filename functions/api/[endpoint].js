import { proxyApi } from '../../server/same-origin-api.js';

export function onRequest({ request }) {
  return proxyApi(request);
}
