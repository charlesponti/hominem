import { Link, Stack } from 'expo-router';
import { Text, makeStyles } from 'theme';

import { Container } from '~/components/Container';

export default function NotFoundScreen() {
  const styles = useStyles();

  return (
    <>
      <Stack.Screen options={{ title: 'NOT_FOUND' }} />
      <Container>
        <Text variant="title" color="foreground">
          RESOURCE_NOT_FOUND.
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="body" color="secondaryForeground">
            RETURN_TO_ROOT
          </Text>
        </Link>
      </Container>
    </>
  );
}

const useStyles = makeStyles((theme) => ({
  link: {
    marginTop: theme.spacing.m_16,
    paddingVertical: theme.spacing.m_16,
  },
}));
