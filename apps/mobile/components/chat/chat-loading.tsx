import { StyleSheet } from 'react-native';

import { Box, Text } from '~/theme';
import { PulsingCircle } from '../animated/pulsing-circle';

function ChatLoading() {
  return (
    <Box style={styles.loading}>
      <Text variant="title">Loading chat messages</Text>
      <PulsingCircle />
    </Box>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    rowGap: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatLoading;
