import { Stack } from 'expo-router'

function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, headerTitle: 'Sign In' }} />
    </Stack>
  )
}

export default AuthLayout
