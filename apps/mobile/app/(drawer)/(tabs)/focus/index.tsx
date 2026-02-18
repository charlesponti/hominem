import { useQueryClient } from '@tanstack/react-query'
import { Link, Stack, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { LoadingContainer } from '~/components/LoadingFull'
import { PulsingCircle } from '~/components/animated/pulsing-circle'
import { FeedbackBlock } from '~/components/feedback-block'
import { FocusHeader } from '~/components/focus/focus-header'
import { FocusList } from '~/components/focus/focus-list'
import { ActiveSearchSummary, type ActiveSearch } from '~/components/focus/focus-search'
import MindsherpaIcon from '~/components/ui/icon'
import { Text, theme } from '~/theme'
import { useFocusQuery } from '~/utils/services/notes/use-focus-query'

export const FocusView = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const {
    data: focusItems,
    refetch,
    isLoading,
    isRefetching,
    isError,
  } = useFocusQuery({
    onSuccess: (data) => {
      setRefreshing(false)
    },
    onError: (error) => {
      setRefreshing(false)
    },
  })

  const onRefresh = useCallback(() => {
    setActiveSearch(null)
    setRefreshing(true)
    queryClient.setQueryData(['focusItems'], [])
    refetch()
  }, [queryClient.setQueryData, refetch])

  const onSearchClose = useCallback(() => {
    onRefresh()
    setActiveSearch(null)
  }, [onRefresh])

  const openInsightsSheet = useCallback(() => {
    router.push('/(drawer)/(tabs)/focus/insights')
  }, [router])

  const goToSherpa = useCallback(() => {
    router.push('/(drawer)/(tabs)/sherpa')
  }, [router])

  const isLoaded = Boolean(!isLoading && !isRefetching && !refreshing)
  const hasFocusItems = !!focusItems && focusItems.length > 0

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="sparkles" onPress={goToSherpa}>
          Sherpa
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button icon="arrow.clockwise" onPress={onRefresh}>
          Refresh
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Button icon="plus" onPress={openInsightsSheet}>
          Quick focus
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button icon="sparkles" onPress={goToSherpa}>
          Sherpa
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <GestureHandlerRootView style={styles.container}>
        <FocusHeader />

        <View style={styles.focusContainer}>
          {isLoading && !isRefetching && !refreshing ? (
            <LoadingContainer>
              <PulsingCircle />
            </LoadingContainer>
          ) : null}

          {isError ? <FocusLoadingError /> : null}

          {(isLoaded || isRefetching) && hasFocusItems ? (
            <View style={styles.focuses}>
              {activeSearch ? (
                <ActiveSearchSummary onCloseClick={onSearchClose} activeSearch={activeSearch} />
              ) : null}
              <FocusList data={focusItems} isRefreshing={isRefetching} onRefresh={refetch} />
            </View>
          ) : null}
          {isLoaded && !hasFocusItems && !activeSearch ? (
            <View style={styles.empty}>
              <Text variant="bodyLarge" color="primary">
                You have no focus items yet.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sherpaButtonContainer}>
          <View style={styles.sherpaCircleButton}>
            <Link href="/(drawer)/(tabs)/sherpa" style={{ flex: 1 }}>
              <MindsherpaIcon name="hat-wizard" size={32} color={theme.colors.white} />
            </Link>
          </View>
        </View>
      </GestureHandlerRootView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  focusContainer: {
    flex: 1,
    rowGap: 12,
    marginTop: 16,
  },
  focuses: {
    flex: 1,
    rowGap: 24,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  empty: {
    marginHorizontal: 12,
    paddingVertical: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  scrollContainer: {
    paddingTop: 12,
  },
  fullLinearGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: theme.colors.black,
    opacity: 0,
  },
  sherpaButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sherpaCircleButton: {
    backgroundColor: theme.colors['fg-primary'],
    borderRadius: 99,
    padding: 12,
    maxWidth: 120,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default FocusView

const FocusLoadingError = React.memo(() => {
  return (
    <View
      style={[
        {
          padding: 12,
          marginHorizontal: 12,
        },
      ]}
    >
      <FeedbackBlock error>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', columnGap: 24 }}>
          <MindsherpaIcon name="circle-exclamation" size={24} color={theme.colors.tomato} />
          <View style={{ flex: 1 }}>
            <Text variant="body" color="black">
              Your focus could not be loaded.
            </Text>
            <Text variant="body" color="black">
              Please, try again later.
            </Text>
          </View>
        </View>
      </FeedbackBlock>
    </View>
  )
})
