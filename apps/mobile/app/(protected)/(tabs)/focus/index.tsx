import { Link, Stack } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PulsingCircle } from '~/components/animated/pulsing-circle';
import { useResumableSessions } from '~/components/chat/session-card';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import { FeedbackBlock } from '~/components/feedback-block';
import { ActiveSearchSummary, type ActiveSearch } from '~/components/focus/focus-search';
import { LoadingContainer } from '~/components/LoadingFull';
import AppIcon from '~/components/ui/icon';
import { InboxStream } from '~/components/workspace/inbox-stream';
import { useMobileWorkspace } from '~/components/workspace/mobile-workspace-context';
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
    },
    focuses: {
      flex: 1,
      rowGap: t.spacing.sm_12,
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
    },
  }),
);

export const FocusView = () => {
  const styles = useStyles();
  const { setHeader } = useMobileWorkspace();
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { data: sessions = [] } = useResumableSessions();
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

  useEffect(() => {
    setHeader({
      kicker: 'Notes-first assistant',
      title: 'Workspace',
    });
  }, [setHeader]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <GestureHandlerRootView testID="focus-screen" style={styles.container}>
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

              <InboxStream focusItems={focusItems} sessions={sessions} />
            </View>
          ) : null}
          {isLoaded && !hasFocusItems && !activeSearch ? (
            <View style={styles.focuses}>
              <InboxStream focusItems={[]} sessions={sessions} />
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
