import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';

import { createServerHonoClient } from '~/lib/api.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { career } = createServerHonoClient(request);
  const importId = new URL(request.url).searchParams.get('importId');
  const response = importId
    ? await career.imports[':id'].$get({ param: { id: importId } })
    : await career.imports.$get({});
  return data(await response.json(), { status: response.status });
}

export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as {
    action?: 'start' | 'retry' | 'dismiss' | 'resolve';
    url?: string;
    importId?: string;
  };
  const { career } = createServerHonoClient(request);

  if (body.action === 'start' && body.url) {
    const response = await career.imports.$post({ json: { url: body.url } });
    return data(await response.json(), { status: response.status });
  }

  if (!body.importId || !['retry', 'dismiss', 'resolve'].includes(body.action ?? '')) {
    return data({ error: 'Invalid import action.' }, { status: 400 });
  }

  const importRoute = career.imports[':id'];
  const response =
    body.action === 'retry'
      ? await importRoute.retry.$post({ param: { id: body.importId } })
      : body.action === 'dismiss'
        ? await importRoute.dismiss.$post({ param: { id: body.importId } })
        : await importRoute.resolve.$post({ param: { id: body.importId } });
  return data(await response.json(), { status: response.status });
}
