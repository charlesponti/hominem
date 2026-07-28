import { Redirect, useLocalSearchParams } from 'expo-router';

import { getTimeBlockRoute, type TimeBlockSource } from '~/services/navigation/routes';

export default function TimeBlockDetailRoute() {
  const { id, source } = useLocalSearchParams<{ id: string; source: TimeBlockSource }>();
  return <Redirect href={getTimeBlockRoute(source, id)} />;
}
