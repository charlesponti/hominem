import { TextField } from '@ponti-studios/ui/native';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Button } from '~/components/ui/button';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import t from '~/translations';

export function MessageEditModal({
  visible,
  draftMessage,
  content,
  onChangeDraft,
  onCancel,
  onSave,
}: {
  visible: boolean;
  draftMessage: string;
  content: string;
  onChangeDraft: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [textPrimary, card, borderDefault] = useCSSVariable([
    '--color-foreground',
    '--color-card',
    '--color-border',
  ]) as string[];

  return (
    <ModalOverlay
      visible={visible}
      onClose={onCancel}
      dismissOnBackdropPress={false}
      position="center"
    >
      <View className="px-5 w-full">
        <View className="bg-background border border-border rounded-md gap-3 px-4 py-4 w-full">
          <Text style={{ color: textPrimary, fontSize: 16 }}>{t.chat.messageEdit.title}</Text>
          <TextField
            multiline
            value={draftMessage}
            onChangeText={onChangeDraft}
            placeholder={t.chat.messageEdit.placeholder}
            selectionColor={textPrimary}
            cursorColor={textPrimary}
            style={{
              borderRadius: 6,
              borderWidth: 1,
              fontSize: 16,
              minHeight: 90,
              paddingHorizontal: 12,
              paddingVertical: 8,
              textAlignVertical: 'top',
              backgroundColor: card,
              borderColor: borderDefault,
              color: textPrimary,
            }}
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label={t.chat.messageEdit.cancel} onPress={onCancel} variant="secondary" />
            </View>
            <View className="flex-1">
              <Button
                label={t.chat.messageEdit.save}
                onPress={onSave}
                disabled={!draftMessage.trim() || draftMessage === content}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </View>
    </ModalOverlay>
  );
}
