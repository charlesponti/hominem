import { Redirect } from 'expo-router'
import React from 'react'
import { Image, View } from 'react-native'

import LoginSheet from '~/components/authentication/login-sheet'
import { Box } from '~/theme'
import { useAuth } from '~/utils/auth-provider'

function Auth() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href="/(drawer)/(tabs)/start" />
  }

  return (
    <Box flex={1}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={require('~/assets/icon.png')}
          style={{ height: 250, maxHeight: 250, maxWidth: 250, width: 250 }}
        />
      </View>
      <LoginSheet />
    </Box>
  )
}

export default Auth
