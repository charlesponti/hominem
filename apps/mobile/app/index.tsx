import { Redirect } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useAuth } from '~/utils/auth-provider'
import { resolveRootIndexRedirect } from '~/utils/navigation/root-index-redirect'

export default function IndexScreen() {
  const { authStatus, isSignedIn } = useAuth()

  if (authStatus === 'booting') {
    return <View style={styles.root} testID="root-bootstrap" />
  }

  return <Redirect href={resolveRootIndexRedirect(isSignedIn) as RelativePathString} />
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
