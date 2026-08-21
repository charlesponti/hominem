import { Text, View } from 'react-native';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
import { TextField } from '~/components/ui';
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
  const [textPrimary, card, borderDefault] = useThemeColor([
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
      <View style={styles.modalContainer}>
        <View style={styles.modalCard}>
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
          <View style={styles.modalActions}>
            <View style={styles.cancelAction}>
              <Button label={t.chat.messageEdit.cancel} onPress={onCancel} variant="secondary" />
            </View>
            <View style={styles.saveAction}>
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

const styles = makeStyles((theme) => ({
  modalContainer: { paddingHorizontal: 20, width: '100%' },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
  },
  modalActions: { flexDirection: 'row', gap: 8 },
  cancelAction: { flex: 1 },
  saveAction: { flex: 1 },
}));
