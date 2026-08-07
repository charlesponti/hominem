import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { TimeBlockDetail } from '~/components/time/TimeBlockDetail';
import { TIME_ROUTE, type TimeBlockSource } from '~/services/navigation/routes';

export default function TimeBlockDetailRoute() {
  const { id, mode, source } = useLocalSearchParams<{
    id?: string;
    mode?: string;
    source?: string;
  }>();
  const router = useRouter();

  if (!id || (source !== 'task' && source !== 'event')) {
    return <Redirect href={TIME_ROUTE} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Time block' }} />
      <TimeBlockDetail
        id={id}
        initialActiveField={mode === 'schedule' ? 'time' : undefined}
        onClose={() => router.back()}
        source={source as TimeBlockSource}
      />
    </>
  );
}
