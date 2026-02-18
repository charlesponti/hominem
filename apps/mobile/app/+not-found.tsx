import { Link, Stack } from 'expo-router';
import { Text, makeStyles } from 'theme';

import { Container } from '~/components/Container';

export default function NotFoundScreen() {
  const styles = useStyles();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Container>
        <Text variant="title">This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text variant="body" color="blue">
            Go to home screen!
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
