import { Redirect, useLocalSearchParams } from 'expo-router';

import { getTimeBlockRoute } from '~/services/navigation/routes';

export default function LegacyTaskDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={getTimeBlockRoute('task', id)} />;
}
