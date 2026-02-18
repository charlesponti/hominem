import { Redirect } from 'expo-router'
import { useState } from 'react'
import { SafeAreaView, View } from 'react-native'
import { Button } from '~/components/Button'
import { FeedbackBlock } from '~/components/feedback-block'
import TextInput from '~/components/text-input'
import { Text, theme } from '~/theme'
import { useAuth } from '~/utils/auth-provider'

const Onboarding = () => {
  const { isSignedIn, currentUser, updateProfile } = useAuth()
  const [name, setName] = useState('')
  const [hasError, setHasError] = useState(false)

  const onButtonPress = async () => {
    if (!currentUser) return
    try {
      setHasError(false)
      await updateProfile({ name })
    } catch {
      setHasError(true)
    }
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />
  }

  if (currentUser?.name) {
    return <Redirect href="/(drawer)/(tabs)/focus" />
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.tertiary,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          paddingHorizontal: 24,
          rowGap: 48,
        }}
      >
        <View
          style={{
            justifyContent: 'center',
            paddingTop: 24,
            alignItems: 'center',
            marginBottom: 48,
            rowGap: 12,
          }}
        >
          <Text variant="header">Welcome!</Text>
          <Text variant="label" color="quaternary">
            Let us know what to call you.
          </Text>
        </View>

        <TextInput
          aria-disabled
          label="Name"
          placeholder="Enter your name"
          value={name}
          style={{ flex: 1 }}
          onChange={(e) => setName(e.nativeEvent.text)}
        />
        <Button title="Create profile" onPress={onButtonPress} />
        {hasError ? (
          <FeedbackBlock error>
            <Text variant="body">There was a problem creating your profile.</Text>
          </FeedbackBlock>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

export default Onboarding
