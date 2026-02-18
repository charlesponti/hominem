import { Redirect } from 'expo-router'
import React from 'react'
import { Image, View } from 'react-native'

import LoginSheet from '~/components/authentication/login-sheet'
import { Box, Text } from '~/theme'
import { useAuth } from '~/utils/auth-provider'

function Auth() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href="/(drawer)/(tabs)/start" />
  }

  return (
    <Box flex={1} style={{ backgroundColor: '#000000' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', rowGap: 24 }}>
        <Image
          source={require('~/assets/icon.png')}
          style={{ height: 120, maxHeight: 120, maxWidth: 120, width: 120 }}
        />
        <Text variant="header" color="foreground">
          AUTHENTICATE
        </Text>
      </View>
      <LoginSheet />
    </Box>
  )
}

export default Auth
