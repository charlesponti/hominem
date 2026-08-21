import { Redirect, Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
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
        <View style={styles.header}>
          <Text style={styles.title}>Native UI Lab</Text>
          <Text style={styles.subtitle}>
            Deterministic Omiro composition fixtures for the smallest supported iPhone.
          </Text>
        </View>
        {sections.map(([id, title, description]) => (
          <View style={styles.sectionCard} key={id} testID={`ui-lab-${id}`}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionDescription}>{description}</Text>
            {id === 'tokens' ? (
              <Text style={styles.tokenDetails}>
                Standard {nativeMotionContracts.duration.standard}ms · row enter{' '}
                {nativeMotionContracts.distance.rowEnter}px
              </Text>
            ) : null}
            {id === 'reduced-motion' ? (
              <Text style={styles.reducedMotionNote}>{nativeMotionContracts.reducedMotion}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = makeStyles((theme) => ({
  header: { gap: 4 },
  title: { ...theme.typography.title1, color: theme.colors.foreground },
  subtitle: { ...theme.typography.body, color: theme.colors.mutedForeground },
  sectionCard: { borderRadius: 16, backgroundColor: theme.colors.card, padding: 16, gap: 8 },
  sectionTitle: { ...theme.typography.headline, color: theme.colors.foreground },
  sectionDescription: { ...theme.typography.subhead, color: theme.colors.mutedForeground },
  tokenDetails: { ...theme.typography.caption1, color: theme.colors.mutedForeground },
  reducedMotionNote: { ...theme.typography.caption1, color: theme.colors.mutedForeground },
}));
