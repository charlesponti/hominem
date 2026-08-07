import { IconButton } from '@ponti-studios/ui/native';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { ComposerSendButton } from '~/components/composer/ComposerSendButton';
import AppIcon from '~/components/ui/icon';
import t from '~/translations';

interface ComposerToolbarProps {
  canEnhance: boolean;
  canSubmit: boolean;
  canToggleVoice: boolean;
  hasContent: boolean;
  isEnhancing: boolean;
  isRecordingElsewhere: boolean;
  isSubmitting: boolean;
  isVoiceBusy: boolean;
  isWalkieTalkie?: boolean;
  onEnhancePress: () => void;
  onSubmit: () => void;
  onVoicePress: () => void;
  onToggleWalkieTalkie?: () => void;
  submitAccessibilityLabel?: string;
  submitTestID: string;
}

export function ComposerToolbar(props: ComposerToolbarProps) {
  const [primary] = useCSSVariable(['--color-primary']) as string[];

  return (
    <View className="flex-row items-center gap-1">
      {props.hasContent ? (
        <IconButton
          accessibilityLabel={t.inboxComposer.composer.enhanceTextA11y}
          disabled={!props.canEnhance}
          variant="plain"
          onPress={props.onEnhancePress}
        >
          <AppIcon name="wand.and.sparkles" size={20} />
        </IconButton>
      ) : null}
      {props.onToggleWalkieTalkie ? (
        <IconButton
          accessibilityLabel={
            props.isWalkieTalkie
              ? t.inboxComposer.composer.disableWalkieTalkieA11y
              : t.inboxComposer.composer.enableWalkieTalkieA11y
          }
          testID="composer-walkie-talkie-toggle"
          variant="plain"
          onPress={props.onToggleWalkieTalkie}
        >
          <AppIcon
            name="antenna.radiowaves.left.and.right"
            size={20}
            tintColor={props.isWalkieTalkie ? primary : undefined}
          />
        </IconButton>
      ) : null}
      <IconButton
        accessibilityLabel={
          props.isRecordingElsewhere
            ? t.inboxComposer.composer.recordingElsewhereA11y
            : t.inboxComposer.composer.startVoiceInputA11y
        }
        disabled={!props.canToggleVoice}
        testID="composer-mic-button"
        variant="plain"
        onPress={props.onVoicePress}
      >
        <AppIcon name="mic.fill" size={20} />
      </IconButton>
      <ComposerSendButton
        accessibilityLabel={
          props.submitAccessibilityLabel ??
          (props.isSubmitting ? t.chat.input.sendingA11y : t.chat.input.sendMessageA11y)
        }
        disabled={!props.canSubmit}
        icon="arrow.up"
        testID={props.submitTestID}
        onPress={props.onSubmit}
      />
    </View>
  );
}
