function getApiBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const envUrl = import.meta.env.VITE_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  if (requestUrl.hostname.includes('localhost')) {
    return 'http://localhost:4040';
  }

  const hostParts = requestUrl.hostname.split('.');
  const rootDomain = hostParts.length > 2 ? hostParts.slice(1).join('.') : requestUrl.hostname;
  return `${requestUrl.protocol}//api.${rootDomain}`;
}

async function handleProxy(request: Request) {
  const requestUrl = new URL(request.url);
  const apiBaseUrl = getApiBaseUrl(request);
  const path = requestUrl.pathname.replace(/^\/api/, '');
  const targetUrl = `${apiBaseUrl}/api${path}${requestUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to proxy request' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function loader({ request }: { request: Request }) {
  return handleProxy(request);
}

export async function action({ request }: { request: Request }) {
  return handleProxy(request);
}
