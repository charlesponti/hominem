import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PulsingCircle } from '~/components/animated/pulsing-circle';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import { FeedbackBlock } from '~/components/feedback-block';
import { ActiveSearchSummary, type ActiveSearch } from '~/components/focus/focus-search';
import { useInputContext } from '~/components/input/input-context';
import { LoadingContainer } from '~/components/LoadingFull';
import AppIcon from '~/components/ui/icon';
import { InboxStream } from '~/components/workspace/inbox-stream';
import { donateAddNoteIntent } from '~/lib/intent-donation';
import { Text, theme, makeStyles } from '~/theme';
import { useNoteStream } from '~/utils/services/notes/use-note-stream';

const FOCUS_SCREEN_OPTIONS = {
  headerShown: false,
} as const;

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors['bg-elevated'],
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
      borderRadius: t.borderRadii.md,
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
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { setMode } = useInputContext();
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Deep link: hakumi://note/add → focus?action=new
  useEffect(() => {
    if (action !== 'new') return;
    setMode('text');
    donateAddNoteIntent();
    // Clear the param so re-focusing the screen doesn't re-trigger
    router.setParams({ action: undefined });
  }, [action, setMode, router]);
  const { data: items = [], refetch, isLoading, isRefetching, isError } = useNoteStream({});

  const onRefresh = useCallback(async () => {
    setActiveSearch(null);
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onSearchClose = useCallback(() => {
    onRefresh();
    setActiveSearch(null);
  }, [onRefresh]);

  const isLoaded = Boolean(!isLoading && !isRefetching && !refreshing);

  return (
    <>
      <Stack.Screen options={FOCUS_SCREEN_OPTIONS} />

      <GestureHandlerRootView testID="focus-screen" style={styles.container}>
        <View style={styles.focusContainer}>
          {isLoading && !isRefetching && !refreshing ? (
            <LoadingContainer>
              <PulsingCircle />
            </LoadingContainer>
          ) : null}

          {isError ? <FocusLoadingError /> : null}

          {isLoaded || isRefetching ? (
            <View style={styles.focuses}>
              {activeSearch ? (
                <ActiveSearchSummary onCloseClick={onSearchClose} activeSearch={activeSearch} />
              ) : null}

              <InboxStream items={items} />
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
