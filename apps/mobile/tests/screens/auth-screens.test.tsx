import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { AuthScreen } from '../../app/(auth)/index'
import { VerifyScreen } from '../../app/(auth)/verify'

const mockReplace = jest.fn()
const mockCompletePasskeySignIn = jest.fn()
const mockRequestEmailOtp = jest.fn()
const mockVerifyEmailOtp = jest.fn()
const mockPasskeySignIn = jest.fn()
let mockIsE2ETesting = false
let mockIsMobilePasskeyEnabled = true

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => href,
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ email: 'mobile-test@hominem.test' }),
}))

jest.mock('../../utils/auth-provider', () => ({
  useAuth: () => ({
    isSignedIn: false,
    completePasskeySignIn: mockCompletePasskeySignIn,
    requestEmailOtp: mockRequestEmailOtp,
    verifyEmailOtp: mockVerifyEmailOtp,
  }),
}))

jest.mock('../../utils/use-mobile-passkey-auth', () => ({
  useMobilePasskeyAuth: () => ({
    signIn: mockPasskeySignIn,
    isLoading: false,
    error: null,
    isSupported: true,
  }),
}))

jest.mock('../../utils/constants', () => ({
  get E2E_TESTING() {
    return mockIsE2ETesting
  },
  get MOBILE_PASSKEY_ENABLED() {
    return mockIsMobilePasskeyEnabled
  },
}))

jest.mock('../../theme', () => ({
  Box: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = require('react-native')
    return <View testID={testID}>{children}</View>
  },
  Text: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { Text } = require('react-native')
    return <Text testID={testID}>{children}</Text>
  },
  theme: {
    colors: {
      foreground: '#ffffff',
      mutedForeground: '#999999',
      background: '#000000',
      muted: '#111111',
      border: '#333333',
      'fg-primary': '#ffffff',
      white: '#ffffff',
      destructive: '#FF3B30',
    },
    spacing: {
      xs_4: 4,
      s_8: 8,
      sm_12: 12,
      m_16: 16,
      ml_24: 24,
      l_32: 32,
      xl_48: 48,
      xl_64: 64,
    },
    borderRadii: {
      s_3: 3,
      sm_6: 6,
      m_6: 6,
      md_10: 10,
      l_12: 12,
      lg_14: 14,
      xl_20: 20,
      xl_24: 24,
    },
  },
  makeStyles: () => () => ({}),
}))

jest.mock('../../components/Button', () => ({
  Button: ({ title, testID, onPress, disabled }: {
    title?: string
    testID?: string
    onPress?: () => void
    disabled?: boolean
  }) => {
    const { Text, TouchableOpacity } = require('react-native')
    return (
      <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    )
  },
}))

jest.mock('../../components/text-input', () => {
  return function MockTextInput(props: {
    testID?: string
    value?: string
    onChangeText?: (value: string) => void
    placeholder?: string
  }) {
    const { TextInput } = require('react-native')
    return (
      <TextInput
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        testID={props.testID}
        value={props.value}
      />
    )
  }
})

jest.mock('../../components/error-boundary', () => ({
  FeatureErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

describe('auth rendered screens', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsE2ETesting = false
    mockIsMobilePasskeyEnabled = true
  })

  it('shows validation error when email is empty', async () => {
    render(<AuthScreen />)

    fireEvent.press(screen.getByTestId('auth-send-otp'))

    expect(await screen.findByTestId('auth-error-text')).toHaveTextContent('EMAIL IS REQUIRED.')
    expect(mockRequestEmailOtp).not.toHaveBeenCalled()
  })

  it('submits normalized email and routes to verify screen', async () => {
    mockRequestEmailOtp.mockResolvedValue(undefined)
    jest.useFakeTimers()

    render(<AuthScreen />)

    fireEvent.changeText(screen.getByTestId('auth-email-input'), '  USER@Example.com  ')
    fireEvent.press(screen.getByTestId('auth-send-otp'))

    await waitFor(() => {
      expect(mockRequestEmailOtp).toHaveBeenCalledWith('user@example.com')
    })

    act(() => {
      jest.runAllTimers()
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-send-otp')).not.toBeDisabled()
    })

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/verify?email=user%40example.com')
    jest.useRealTimers()
  })

  it('shows verify screen validation error when OTP is invalid', async () => {
    render(<VerifyScreen />)

    fireEvent.changeText(screen.getByTestId('auth-otp-input'), '12')
    fireEvent.press(screen.getByTestId('auth-verify-otp'))

    expect(await screen.findByTestId('auth-error-text')).toHaveTextContent('CODE MUST BE 6 DIGITS.')
    expect(mockVerifyEmailOtp).not.toHaveBeenCalled()
  })

  it('submits normalized OTP to verify flow', async () => {
    mockVerifyEmailOtp.mockResolvedValue(undefined)

    render(<VerifyScreen />)

    fireEvent.changeText(screen.getByTestId('auth-otp-input'), '12 34-56')
    fireEvent.press(screen.getByTestId('auth-verify-otp'))

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith({
        email: 'mobile-test@hominem.test',
        otp: '123456',
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-verify-otp')).not.toBeDisabled()
    })
  })

  it('renders six OTP slots and mirrors pasted digits into the slots', async () => {
    render(<VerifyScreen />)

    fireEvent.changeText(screen.getByTestId('auth-otp-input'), '12 34-56')

    expect(screen.getByTestId('auth-otp-slot-0')).toHaveTextContent('1')
    expect(screen.getByTestId('auth-otp-slot-1')).toHaveTextContent('2')
    expect(screen.getByTestId('auth-otp-slot-2')).toHaveTextContent('3')
    expect(screen.getByTestId('auth-otp-slot-3')).toHaveTextContent('4')
    expect(screen.getByTestId('auth-otp-slot-4')).toHaveTextContent('5')
    expect(screen.getByTestId('auth-otp-slot-5')).toHaveTextContent('6')
  })

  it('resends the code and shows resend confirmation', async () => {
    mockRequestEmailOtp.mockResolvedValue(undefined)

    render(<VerifyScreen />)

    fireEvent.press(screen.getByTestId('auth-resend-otp'))

    await waitFor(() => {
      expect(mockRequestEmailOtp).toHaveBeenCalledWith('mobile-test@hominem.test')
    })

    expect(await screen.findByTestId('auth-resend-message')).toHaveTextContent('A new code is on the way.')
  })

  it('shows inline error and re-enables submit on OTP verify failure', async () => {
    mockVerifyEmailOtp.mockRejectedValue(new Error('Invalid or expired code.'))

    render(<VerifyScreen />)

    fireEvent.changeText(screen.getByTestId('auth-otp-input'), '123456')
    fireEvent.press(screen.getByTestId('auth-verify-otp'))

    expect(await screen.findByTestId('auth-error-text')).toHaveTextContent('INVALID OR EXPIRED CODE.')

    // Button must be re-enabled after rejection so the user can retry
    await waitFor(() => {
      expect(screen.getByTestId('auth-verify-otp')).not.toBeDisabled()
    })
  })

  it('disables send-code button while OTP request is in-flight', async () => {
    let resolveOtp!: () => void
    mockRequestEmailOtp.mockReturnValue(new Promise<void>((res) => { resolveOtp = res }))

    render(<AuthScreen />)
    fireEvent.changeText(screen.getByTestId('auth-email-input'), 'user@example.com')
    fireEvent.press(screen.getByTestId('auth-send-otp'))

    expect(screen.getByTestId('auth-send-otp')).toBeDisabled()

    await act(async () => {
      resolveOtp()
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-send-otp')).not.toBeDisabled()
    })
  })

  it('disables verify button while OTP verify is in-flight', async () => {
    let resolveVerify!: () => void
    mockVerifyEmailOtp.mockReturnValue(new Promise<void>((res) => { resolveVerify = res }))

    render(<VerifyScreen />)
    fireEvent.changeText(screen.getByTestId('auth-otp-input'), '123456')
    fireEvent.press(screen.getByTestId('auth-verify-otp'))

    expect(screen.getByTestId('auth-verify-otp')).toBeDisabled()

    await act(async () => {
      resolveVerify()
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-verify-otp')).not.toBeDisabled()
    })
  })

  it('shows passkey CTA when supported and invokes passkey sign-in', async () => {
    mockPasskeySignIn.mockResolvedValue({
      accessToken: 'passkey-access-token',
      refreshToken: 'passkey-refresh-token',
      expiresIn: 600,
      tokenType: 'Bearer',
      user: {
        id: 'passkey-user',
        email: 'passkey-user@hominem.test',
      },
    })

    render(<AuthScreen />)

    fireEvent.press(screen.getByTestId('auth-passkey-button'))

    await waitFor(() => {
      expect(mockPasskeySignIn).toHaveBeenCalledTimes(1)
      expect(mockCompletePasskeySignIn).toHaveBeenCalledTimes(1)
    })
  })

  it('hides passkey CTA when the mobile passkey flag is disabled', () => {
    mockIsMobilePasskeyEnabled = false

    render(<AuthScreen />)

    expect(screen.queryByTestId('auth-passkey-button')).toBeNull()
    expect(screen.queryByTestId('auth-e2e-passkey-success')).toBeNull()
    expect(screen.queryByTestId('auth-e2e-passkey-cancel')).toBeNull()
  })
})
