import { Link, Stack } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PulsingCircle } from '~/components/animated/pulsing-circle';
import { CaptureBar } from '~/components/capture/capture-bar';
import { SessionList, useResumableSessions } from '~/components/chat/session-card';
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
      backgroundColor: t.colors.background,
    },
    focusContainer: {
      flex: 1,
      rowGap: t.spacing.m_16,
      marginTop: t.spacing.m_16,
    },
    captureSection: {
      paddingHorizontal: t.spacing.m_16,
      rowGap: t.spacing.sm_8,
    },
    sessionSection: {
      paddingHorizontal: t.spacing.m_16,
      rowGap: t.spacing.sm_8,
    },
    focuses: {
      flex: 1,
      rowGap: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
    },
    empty: {
      marginHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.xl_64,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.background,
      borderRadius: t.borderRadii.xl_20,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    sectionLabel: {
      letterSpacing: 1,
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
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { data: sessions } = useResumableSessions();
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
          title: 'Notes',
          headerRight: () => (
            <View style={headerRightStyles.row}>
              <Link href={'/(protected)/(tabs)/sherpa' as RelativePathString}>
                <Text variant="body" color="text-secondary">
                  Sherpa
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
        <FocusHeader sessionCount={sessions?.length ?? 0} noteCount={focusItems?.length ?? 0} />

        <View style={styles.focusContainer}>
          {isLoading && !isRefetching && !refreshing ? (
            <LoadingContainer>
              <PulsingCircle />
            </LoadingContainer>
          ) : null}

          {isError ? <FocusLoadingError /> : null}

          {(isLoaded || isRefetching) && hasFocusItems ? (
            <View style={styles.focuses}>
              <View style={styles.captureSection}>
                <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
                  Capture
                </Text>
                <CaptureBar />
              </View>

              <View style={styles.sessionSection}>
                <SessionList />
              </View>

              {activeSearch ? (
                <ActiveSearchSummary onCloseClick={onSearchClose} activeSearch={activeSearch} />
              ) : null}

              <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
                Notes
              </Text>
              <FocusList data={focusItems} isRefreshing={isRefetching} onRefresh={refetch} />
            </View>
          ) : null}
          {isLoaded && !hasFocusItems && !activeSearch ? (
            <View style={styles.focuses}>
              <View style={styles.captureSection}>
                <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
                  Capture
                </Text>
                <CaptureBar />
              </View>

              <View style={styles.sessionSection}>
                <SessionList />
              </View>

              <Text variant="caption" color="text-secondary" style={styles.sectionLabel}>
                Notes
              </Text>
              <View style={styles.empty}>
                <Text variant="bodyLarge" color="foreground">
                  Start with a thought
                </Text>
                <Text variant="body" color="text-secondary">
                  Capture something above and it will join the same stream as the rest of your
                  notes.
                </Text>
              </View>
            </View>
          ) : null}
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
