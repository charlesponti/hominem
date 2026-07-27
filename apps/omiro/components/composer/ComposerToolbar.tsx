import type { SFSymbol } from 'expo-symbols';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ComposerMedia } from '~/components/composer/ComposerMedia';
import { componentSizes, makeStyles, spacing, useThemeColors } from '~/components/theme';
import { IconButton } from '~/components/ui/icon-button';
import t from '~/translations';

interface ComposerActionProps {
  canEnhance: boolean;
  canPickMedia: boolean;
  canSubmit: boolean;
  canToggleVoice: boolean;
  hasContent: boolean;
  isCleaningVoice: boolean;
  isEnhancing: boolean;
  isRecordingElsewhere: boolean;
  isSubmitting: boolean;
  isVoiceBusy: boolean;
  onEnhancePress: () => void;
  onSubmit: () => void;
  onVoicePress: () => void;
  secondaryAction?: {
    accessibilityLabel: string;
    icon: SFSymbol;
    onPress: () => void;
    testID?: string;
  };
  submitAccessibilityLabel?: string;
  submitTestID: string;
}

export function ComposerLeadingAction({ canPickMedia }: Pick<ComposerActionProps, 'canPickMedia'>) {
  return (
    <ComposerMedia
      accessibilityLabel={t.inboxComposer.composer.addAttachmentA11y}
      disabled={!canPickMedia}
    />
  );
}

export function ComposerTrailingAction({
  canSubmit,
  canToggleVoice,
  hasContent,
  isRecordingElsewhere,
  isSubmitting,
  isVoiceBusy,
  onSubmit,
  onVoicePress,
  submitAccessibilityLabel,
  submitTestID,
}: Pick<
  ComposerActionProps,
  | 'canSubmit'
  | 'canToggleVoice'
  | 'hasContent'
  | 'isRecordingElsewhere'
  | 'isSubmitting'
  | 'isVoiceBusy'
  | 'onSubmit'
  | 'onVoicePress'
  | 'submitAccessibilityLabel'
  | 'submitTestID'
>) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const tintColor = themeColors['primary-foreground'];

  return hasContent ? (
    <IconButton
      accessibilityLabel={
        submitAccessibilityLabel ??
        (isSubmitting ? t.chat.input.sendingA11y : t.chat.input.sendMessageA11y)
      }
      circular
      disabled={!canSubmit}
      icon="arrow.up"
      iconSize={componentSizes.icon}
      isAnimating={isSubmitting}
      style={styles.primary}
      testID={submitTestID}
      tintColor={tintColor}
      variant="surface"
      onPress={onSubmit}
    />
  ) : (
    <IconButton
      accessibilityLabel={
        isRecordingElsewhere
          ? t.inboxComposer.composer.recordingElsewhereA11y
          : t.inboxComposer.composer.startVoiceInputA11y
      }
      circular
      disabled={!canToggleVoice}
      icon="mic.fill"
      iconSize={componentSizes.icon}
      isAnimating={isVoiceBusy}
      testID="composer-mic-button"
      variant="ghost"
      onPress={onVoicePress}
    />
  );
}

export function ComposerSecondaryActions({
  canEnhance,
  hasContent,
  isCleaningVoice,
  isEnhancing,
  onEnhancePress,
  secondaryAction,
}: Pick<
  ComposerActionProps,
  | 'canEnhance'
  | 'hasContent'
  | 'isCleaningVoice'
  | 'isEnhancing'
  | 'onEnhancePress'
  | 'secondaryAction'
>) {
  const styles = useStyles();
  if (!hasContent) return null;

  return (
    <Reanimated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      style={styles.secondary}
      testID="composer-secondary-actions"
    >
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
        circular
        disabled={!canEnhance}
        icon="wand.and.sparkles"
        iconSize={componentSizes.icon}
        isAnimating={isEnhancing || isCleaningVoice}
        variant="surface"
        onPress={onEnhancePress}
      />
      {secondaryAction ? (
        <IconButton
          accessibilityLabel={secondaryAction.accessibilityLabel}
          circular
          icon={secondaryAction.icon}
          iconSize={componentSizes.icon}
          testID={secondaryAction.testID}
          variant="surface"
          onPress={secondaryAction.onPress}
        />
      ) : null}
    </Reanimated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  primary: { backgroundColor: theme.colors.primary },
  secondary: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: spacing[2],
  },
}));
