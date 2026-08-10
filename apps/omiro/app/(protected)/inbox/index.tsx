import { Redirect } from 'expo-router';

import { HOME_ROUTE } from '~/services/navigation/routes';

export default function InboxRoute() {
  return <Redirect href={HOME_ROUTE} />;
}
