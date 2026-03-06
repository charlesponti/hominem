import { Stack } from 'expo-router';

function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, headerTitle: 'AUTH' }} />
      <Stack.Screen name="verify" options={{ headerShown: false, headerTitle: 'VERIFY' }} />
    </Stack>
  );
}

export default AuthLayout;
