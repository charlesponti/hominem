import { Text, View } from 'react-native';

import { useAppTheme, useStyles } from '~/components/theme';
import { TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import t from '~/translations';

function getInitials(name: string, fallback: string): string {
  const source = name.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AccountIdentitySection({
  currentUserId,
  email,
  name,
  nameChanged,
  onNameChange,
  onSavePress,
  saveError,
  saveStatus,
}: {
  currentUserId: string | undefined;
  email: string | undefined;
  name: string;
  nameChanged: boolean;
  onNameChange: (name: string) => void;
  onSavePress: () => void;
  saveError: string | null;
  saveStatus: 'idle' | 'saving' | 'saved';
}) {
  const { popover: popoverColor, foreground: textPrimaryColor } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
    avatar: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      height: 52,
      width: 52,
    },
    avatarText: { fontSize: 19, fontWeight: '700', color: theme.colors.foreground },
    identityContent: { flex: 1, gap: 2 },
    nameField: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2, padding: 0 },
    email: { fontSize: 13, color: theme.colors.mutedForeground },
    saveRow: { alignItems: 'flex-start', paddingHorizontal: 16 },
    savedMessage: { fontSize: 13, color: theme.colors.mutedForeground, paddingHorizontal: 16 },
    saveError: { fontSize: 13, color: theme.colors.destructive, paddingHorizontal: 16 },
  }));

  return (
    <>
      <View style={styles.identityRow}>
        <View style={[styles.avatar, { backgroundColor: popoverColor }]}>
          <Text style={styles.avatarText}>{getInitials(name, email ?? '?')}</Text>
        </View>
        <View style={styles.identityContent}>
          <TextField
            key={`name-${currentUserId ?? 'anonymous'}`}
            value={name}
            placeholder={t.settings.name.placeholder}
            returnKeyType="done"
            selectionColor={textPrimaryColor}
            cursorColor={textPrimaryColor}
            style={[styles.nameField, { borderWidth: 0, color: textPrimaryColor }]}
            onChangeText={onNameChange}
            onSubmitEditing={() => {
              if (nameChanged) {
                onSavePress();
              }
            }}
          />
          <Text style={styles.email}>{email ?? t.settings.emailMissing}</Text>
        </View>
      </View>

      {nameChanged ? (
        <View style={styles.saveRow}>
          <Button
            label={saveStatus === 'saving' ? t.settings.name.saving : t.settings.name.save}
            onPress={onSavePress}
            disabled={saveStatus === 'saving'}
            variant="secondary"
            size="sm"
          />
        </View>
      ) : null}
      {saveStatus === 'saved' ? (
        <Text style={styles.savedMessage}>{t.settings.name.saved}</Text>
      ) : null}
      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
    </>
  );
}
