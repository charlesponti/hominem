import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '~/components/Button';
import { makeStyles, Text } from '~/theme';

export default function ErrorScreen({ error }: { error: Error }) {
  const router = useRouter();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text variant="header" color="foreground">
        Something went wrong
      </Text>
      <Text variant="body" color="text-tertiary" style={styles.message}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <Button
        variant="primary"
        style={styles.button}
        onPress={() => router.replace('/' as RelativePathString)}
        title="Go Home"
      />
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.background,
      padding: t.spacing.ml_24,
    },
    message: {
      marginTop: t.spacing.sm_12,
      textAlign: 'center',
      maxWidth: 300,
    },
    button: {
      marginTop: t.spacing.ml_24,
      backgroundColor: t.colors['text-primary'],
    },
  }),
);
