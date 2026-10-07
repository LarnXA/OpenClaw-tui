import { GatewayClient } from '@openclaw/gateway-client';
import { PROTOCOL_VERSION } from '@openclaw/gateway-protocol/version';

export function createGw(opts){
  const st = { connected: false, error: null, hello: null };
  const client = new GatewayClient({
    url: opts.url,
    token: opts.token,
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    onHelloOk: (h) => { st.connected = true; st.hello = h; if (opts.onHello) opts.onHello(h); },
    onConnectError: (e) => { st.error = String((e && e.message) || e); if (opts.onError) opts.onError(st.error); },
    onEvent: (ev) => { if (opts.onEvent) opts.onEvent(ev); }
  });
  client.start();
  return {
    state: st,
    request: (m, p) => client.request(m, p),
    stop: () => { try { client.stop(); } catch (e) {} }
  };
}
