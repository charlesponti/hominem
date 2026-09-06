import { Redirect } from 'expo-router';

import { STREAM_ROUTE } from '~/services/navigation/routes';

export default function HomeRoute() {
  return <Redirect href={STREAM_ROUTE} />;
}
