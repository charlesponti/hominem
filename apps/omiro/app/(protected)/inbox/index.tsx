import { Redirect } from 'expo-router';

import { ALL_ROUTE } from '~/services/navigation/routes';

export default function InboxRoute() {
  return <Redirect href={ALL_ROUTE} />;
}
