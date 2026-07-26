import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import { View } from 'react-native';
import Reanimated, { LinearTransition, SlideInRight, SlideOutRight } from 'react-native-reanimated';

import { ComposerMedia } from '~/components/composer/ComposerMedia';
import {
  PRIMARY_BTN_SIZE,
  TOOLBAR_ICON_SIZE,
  TOOL_BTN_SIZE,
} from '~/components/composer/constants';
import { makeStyles, useThemeColors } from '~/components/theme';
import { spacing } from '~/components/theme/tokens';
import { IconButton } from '~/components/ui/icon-button';
import t from '~/translations';

interface ComposerToolbarProps {
  isInbox: boolean;
  isRecording: boolean;
  isRecordingElsewhere: boolean;
  isVoiceBusy: boolean;
  isEnhancing: boolean;
  isCleaningVoice: boolean;
  canPickMedia: boolean;
  canToggleVoice: boolean;
  canEnhance: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  onVoicePress: () => void;
  onEnhancePress: () => void;
  onSubmit: () => void;
  submitTestID: string;
  submitAccessibilityLabel: string | undefined;
  secondaryAction?: {
    accessibilityLabel: string;
    icon: SFSymbol;
    onPress: () => void;
    testID?: string;
  };
}

const buttonEnter = SlideInRight.duration(180);
const buttonExit = SlideOutRight.duration(150);
const pillLayout = LinearTransition.duration(180);

export function ComposerToolbar({
  isInbox,
  isRecording,
  isRecordingElsewhere,
  isVoiceBusy,
  isEnhancing,
  isCleaningVoice,
  canPickMedia,
  canToggleVoice,
  canEnhance,
  canSubmit,
  isSubmitting,
  onVoicePress,
  onEnhancePress,
  onSubmit,
  submitTestID,
  submitAccessibilityLabel,
  secondaryAction,
}: ComposerToolbarProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();

  return (
    <View style={styles.toolbar}>
      <View style={styles.leading}>
        {isRecording ? null : (
          <ComposerMedia
            accessibilityLabel={t.inboxComposer.composer.addAttachmentA11y}
            disabled={!canPickMedia}
          />
        )}
      </View>
      <Reanimated.View style={styles.trailing} layout={pillLayout}>
        {isRecording ? null : (
          <IconButton
            accessibilityLabel={
              isRecordingElsewhere
                ? t.inboxComposer.composer.recordingElsewhereA11y
                : t.inboxComposer.composer.startVoiceInputA11y
            }
            circular
            disabled={!canToggleVoice}
            icon="mic.fill"
            iconSize={TOOLBAR_ICON_SIZE}
            isAnimating={isVoiceBusy}
            size={TOOL_BTN_SIZE}
            testID="composer-mic-button"
            variant="ghost"
            onPress={onVoicePress}
          />
        )}
        {canSubmit ? (
          <Reanimated.View entering={buttonEnter} exiting={buttonExit}>
            <IconButton
              accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
              circular
              disabled={!canEnhance}
              icon="wand.and.sparkles"
              iconSize={TOOLBAR_ICON_SIZE}
              isAnimating={isEnhancing || isCleaningVoice}
              size={TOOL_BTN_SIZE}
              variant="surface"
              onPress={onEnhancePress}
            />
          </Reanimated.View>
        ) : null}
        {isInbox && secondaryAction && canSubmit ? (
          <Reanimated.View
            entering={buttonEnter}
            exiting={buttonExit}
            style={styles.secondaryAction}
          >
            <IconButton
              accessibilityLabel={secondaryAction.accessibilityLabel}
              circular
              disabled={isSubmitting || !canSubmit}
              icon={secondaryAction.icon}
              iconSize={TOOLBAR_ICON_SIZE}
              size={TOOL_BTN_SIZE}
              testID={secondaryAction.testID}
              tintColor={themeColors['text-tertiary']}
              variant="surface"
              onPress={secondaryAction.onPress}
            />
          </Reanimated.View>
        ) : null}
        {canSubmit ? (
          <Reanimated.View entering={buttonEnter} exiting={buttonExit}>
            <IconButton
              accessibilityLabel={
                submitAccessibilityLabel ??
                (isSubmitting ? t.chat.input.sendingA11y : t.chat.input.sendMessageA11y)
              }
              circular
              disabled={!canSubmit}
              icon="arrow.up"
              iconSize={TOOLBAR_ICON_SIZE}
              size={PRIMARY_BTN_SIZE}
              style={styles.primarySubmit}
              tintColor={themeColors['text-on-accent']}
              testID={submitTestID}
              variant="primary"
              onPress={onSubmit}
            />
          </Reanimated.View>
        ) : null}
      </Reanimated.View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: PRIMARY_BTN_SIZE,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: 32,
    paddingHorizontal: spacing[1],
  },
  primarySubmit: {
    backgroundColor: theme.colors.accent,
  },
  secondaryAction: {
    marginLeft: spacing[2],
  },
}));
