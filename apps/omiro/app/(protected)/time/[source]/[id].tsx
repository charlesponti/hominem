import { useLocalSearchParams } from 'expo-router';

import { TimeBlockDetail, type TimeBlockDetailSource } from '~/components/time/TimeBlockDetail';

export default function TimeBlockDetailRoute() {
  const { id, source } = useLocalSearchParams<{ id: string; source: TimeBlockDetailSource }>();
  return <TimeBlockDetail id={id} source={source} />;
}
