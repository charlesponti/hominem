import React from 'react'
import { Button, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library'

import { normalizeEmail } from '../../utils/auth/validation'

function IndexRoute() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')

  return (
    <View>
      <TextInput testID="auth-email-input" onChangeText={setEmail} value={email} />
      <Button
        testID="auth-send-otp"
        title="SEND_CODE"
        onPress={() => {
          const normalizedEmail = normalizeEmail(email)
          router.replace(`/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}`)
        }}
      />
    </View>
  )
}

function VerifyRoute() {
  const { email } = useLocalSearchParams<{ email: string }>()

  return (
    <View>
      <Text>{`Enter the code we sent to ${email}`}</Text>
    </View>
  )
}

describe('auth router', () => {
  it('navigates from the auth screen to verify with a normalized email', async () => {
    renderRouter({
      '(auth)/index': { default: IndexRoute },
      '(auth)/verify': { default: VerifyRoute },
    })

    fireEvent.changeText(screen.getByTestId('auth-email-input'), '  USER@Example.com ')
    fireEvent.press(screen.getByTestId('auth-send-otp'))

    await waitFor(() => {
      expect(screen).toHavePathname('/verify')
    })

    expect(screen).toHavePathnameWithParams('/verify?email=user%40example.com')
    expect(screen.getByText('Enter the code we sent to user@example.com')).toBeTruthy()
  })

  it('hydrates the verify route from a deep link email parameter', async () => {
    renderRouter(
      {
        '(auth)/index': { default: IndexRoute },
        '(auth)/verify': { default: VerifyRoute },
      },
      {
        initialUrl: '/verify?email=mobile-route@hominem.test',
      },
    )

    await waitFor(() => {
      expect(screen).toHavePathname('/verify')
    })

    expect(screen).toHavePathnameWithParams('/verify?email=mobile-route%40hominem.test')
    expect(screen.getByText('Enter the code we sent to mobile-route@hominem.test')).toBeTruthy()
  })
})
