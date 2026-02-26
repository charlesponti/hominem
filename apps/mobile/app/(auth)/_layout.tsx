import { Stack } from 'expo-router';

function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, headerTitle: 'AUTH' }} />
    </Stack>
  );
}

export default AuthLayout;
