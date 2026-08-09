import { Redirect, Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { nativeMotionContracts } from '~/services/motion/native-motion';
import { HOME_ROUTE } from '~/services/navigation/routes';

const sections = [
  ['tokens', 'Tokens', 'Color, spacing, radius, and motion contracts'],
  ['typography', 'Typography', 'Dynamic Type-ready text samples'],
  ['surfaces', 'Surfaces', 'Cards, rows, and composition boundaries'],
  ['controls', 'Controls', 'Native controls and disabled states'],
  ['feedback', 'Feedback', 'Loading, error, and empty-state fixtures'],
  ['gestures', 'Gestures', 'Gesture ownership and cancellation notes'],
  ['transitions', 'Transitions', 'Interruptible enter and exit contracts'],
  ['reduced-motion', 'Reduce Motion', 'Reduced-motion substitutions'],
] as const;

export default function UiLabRoute() {
  if (!__DEV__) return <Redirect href={HOME_ROUTE} />;

  return (
    <>
      <Stack.Screen options={{ title: 'UI Lab' }} />
      <ScrollView
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 40 }}
        testID="ui-lab"
      >
        <View className="gap-1">
          <Text className="text-title1 text-foreground">Native UI Lab</Text>
          <Text className="text-body text-muted-foreground">
            Deterministic Omiro composition fixtures for the smallest supported iPhone.
          </Text>
        </View>
        {sections.map(([id, title, description]) => (
          <View className="rounded-2xl bg-card p-4 gap-2" key={id} testID={`ui-lab-${id}`}>
            <Text className="text-headline text-foreground">{title}</Text>
            <Text className="text-subhead text-muted-foreground">{description}</Text>
            {id === 'tokens' ? (
              <Text className="text-caption1 text-muted-foreground">
                Standard {nativeMotionContracts.duration.standard}ms · row enter{' '}
                {nativeMotionContracts.distance.rowEnter}px
              </Text>
            ) : null}
            {id === 'reduced-motion' ? (
              <Text className="text-caption1 text-muted-foreground">
                {nativeMotionContracts.reducedMotion}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </>
  );
}
