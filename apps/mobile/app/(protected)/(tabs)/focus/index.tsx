import { Link, Stack } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PulsingCircle } from '~/components/animated/pulsing-circle';
import { CaptureBar } from '~/components/capture/capture-bar';
import { SessionList } from '~/components/chat/session-card';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import { FeedbackBlock } from '~/components/feedback-block';
import { FocusHeader } from '~/components/focus/focus-header';
import { FocusList } from '~/components/focus/focus-list';
import { ActiveSearchSummary, type ActiveSearch } from '~/components/focus/focus-search';
import { LoadingContainer } from '~/components/LoadingFull';
import AppIcon from '~/components/ui/icon';
import { Text, theme, makeStyles } from '~/theme';
import { useFocusQuery } from '~/utils/services/notes/use-focus-query';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
      backgroundColor: t.colors.background,
    },
    focusContainer: {
      flex: 1,
      rowGap: t.spacing.sm_12,
      marginTop: t.spacing.m_16,
    },
    sessionSection: {
      paddingHorizontal: t.spacing.sm_12,
      paddingTop: t.spacing.sm_12,
    },
    focuses: {
      flex: 1,
      rowGap: t.spacing.ml_24,
      paddingTop: t.spacing.sm_12,
      paddingHorizontal: t.spacing.sm_12,
    },
    empty: {
      marginHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.xl_64,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.muted,
      borderRadius: t.borderRadii.sm_6,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    scrollContainer: {
      paddingTop: t.spacing.sm_12,
    },
    sherpaButtonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    sherpaLink: {
      flex: 1,
    },
    sherpaCircleButton: {
      backgroundColor: t.colors.muted,
      borderRadius: 999, // special: infinite radius
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      padding: t.spacing.sm_12,
      maxWidth: 120,
      marginBottom: t.spacing.ml_24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);

const useHeaderRightStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      columnGap: t.spacing.sm_8,
    },
  }),
);

const useErrorStyles = makeStyles((t) =>
  StyleSheet.create({
    wrapper: {
      padding: t.spacing.sm_12,
      marginHorizontal: t.spacing.sm_12,
    },
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.ml_24,
    },
    textCol: {
      flex: 1,
    },
  }),
);

export const FocusView = () => {
  const styles = useStyles();
  const headerRightStyles = useHeaderRightStyles();
  const insets = useSafeAreaInsets();
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const {
    data: focusItems,
    refetch,
    isLoading,
    isRefetching,
    isError,
  } = useFocusQuery({
    onSuccess: () => {
      setRefreshing(false);
    },
    onError: () => {
      setRefreshing(false);
    },
  });

  const onRefresh = useCallback(() => {
    setActiveSearch(null);
    setRefreshing(true);
    refetch();
  }, [refetch]);

  const onSearchClose = useCallback(() => {
    onRefresh();
    setActiveSearch(null);
  }, [onRefresh]);

  const isLoaded = Boolean(!isLoading && !isRefetching && !refreshing);
  const hasFocusItems = !!focusItems && focusItems.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'FOCUS',
          headerRight: () => (
            <View style={headerRightStyles.row}>
              <Link href={'/(protected)/(tabs)/sherpa' as RelativePathString}>
                <Text variant="body" color="text-secondary">
                  SHERPA
                </Text>
              </Link>
              <Text
                variant="body"
                color="text-secondary"
                onPress={onRefresh}
                accessibilityRole="button"
              >
                REFRESH
              </Text>
            </View>
          ),
        }}
      />

      <GestureHandlerRootView testID="focus-screen" style={styles.container}>
        <FocusHeader />
        <CaptureBar />

        <View style={styles.sessionSection}>
          <SessionList />
        </View>

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
                NO ACTIVE FOCUS ITEMS.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.sherpaButtonContainer, { bottom: insets.bottom }]}>
          <View style={styles.sherpaCircleButton}>
            <Link
              href={'/(protected)/(tabs)/sherpa' as RelativePathString}
              style={styles.sherpaLink}
              accessibilityLabel="Open Sherpa"
            >
              <AppIcon name="hat-wizard" size={32} color={theme.colors.white} />
            </Link>
          </View>
        </View>
      </GestureHandlerRootView>
    </>
  );
};

const FocusViewWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="Focus">
    <FocusView />
  </FeatureErrorBoundary>
);

export default FocusViewWithErrorBoundary;

const FocusLoadingError = React.memo(() => {
  const errorStyles = useErrorStyles();
  return (
    <View style={errorStyles.wrapper}>
      <FeedbackBlock error>
        <View style={errorStyles.row}>
          <AppIcon name="circle-exclamation" size={24} color={theme.colors.destructive} />
          <View style={errorStyles.textCol}>
            <Text variant="body" color="foreground">
              FOCUS LOAD FAILED.
            </Text>
            <Text variant="body" color="text-secondary">
              RETRY LATER.
            </Text>
          </View>
        </View>
      </FeedbackBlock>
    </View>
  );
});
