import { Link } from 'expo-router'
import React, { type PropsWithChildren } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, theme } from '~/theme'
import MindsherpaIcon from './ui/icon'

export const ViewHeader = ({ children }: PropsWithChildren) => {
  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Link href="/(drawer)/(tabs)/focus">
          <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12 }}>
            <MindsherpaIcon name="arrow-left" size={26} color={theme.colors.black} />
            <Text variant="bodyLarge">Today</Text>
          </View>
        </Link>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginTop: 50,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    // opacity: 0.8,
    // backgroundColor: theme.colors.grayLight,
  },
  gradient: {
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 24,
  },
})
