import { View } from 'react-native';

import { useStyles } from '~/components/theme';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';

export function CancelRow({ onCancel, testID }: { onCancel?: () => void; testID: string }) {
  const styles = useStyles(() => ({
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
  }));
  return (
    <View style={styles.actions}>
      <CancelButton testID={testID} onCancel={onCancel} />
    </View>
  );
}

export function CancelButton({ onCancel, testID }: { onCancel?: () => void; testID: string }) {
  return (
    <IconButton accessibilityLabel="Cancel" testID={testID} onPress={onCancel}>
      <AppIcon name="xmark" size={20} />
    </IconButton>
  );
}
