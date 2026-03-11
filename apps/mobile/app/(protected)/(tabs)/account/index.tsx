import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import TextInput from '~/components/text-input';
import { Text, theme } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { MOBILE_PASSKEY_ENABLED } from '~/utils/constants';
import { useMobilePasskeyAuth } from '~/utils/use-mobile-passkey-auth';

function Account() {
  const insets = useSafeAreaInsets();
  const { isSignedIn, signOut, currentUser, updateProfile } = useAuth();
  const {
    addPasskey,
    listPasskeys,
    deletePasskey,
    isLoading: isPasskeyLoading,
  } = useMobilePasskeyAuth();
  const initialName = currentUser?.name || '';
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [passkeys, setPasskeys] = useState<{ id: string; name: string }[]>([]);

  const onSavePress = () => {
    setIsSaving(true);
    updateProfile({ name })
      .catch(() => undefined)
      .finally(() => setIsSaving(false));
  };

  const onLogoutPress = () => {
    signOut();
  };

  const onDeleteAccountPress = () => {
    Alert.alert(
      'Account deletion unavailable',
      'Account deletion is not available in this release yet.',
      [{ text: 'OK', style: 'default' }],
    );
  };

  const onAddPasskeyPress = async () => {
    const result = await addPasskey();
    if (result.success) {
      const updated = await listPasskeys();
      setPasskeys(updated);
    } else {
      Alert.alert('Passkey error', result.error ?? 'Could not add passkey.');
    }
  };

  const onDeletePasskeyPress = (id: string, passkeyName: string) => {
    Alert.alert('Remove passkey', `Remove "${passkeyName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await deletePasskey(id);
          if (result.success) {
            setPasskeys((prev) => prev.filter((p) => p.id !== id));
          } else {
            Alert.alert('Error', result.error ?? 'Could not remove passkey.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!MOBILE_PASSKEY_ENABLED) {
      setPasskeys([]);
      return;
    }
    if (isSignedIn) {
      listPasskeys()
        .then(setPasskeys)
        .catch(() => undefined);
    }
  }, [isSignedIn, listPasskeys]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <View testID="account-screen" style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="cardHeader" color="foreground">
          ACCOUNT
        </Text>
        <View style={styles.formSection}>
          <View>
            <TextInput
              aria-disabled
              label="Name"
              placeholder="ENTER NAME"
              value={name}
              style={styles.inputFlex}
              onChange={(e) => setName(e.nativeEvent.text)}
            />
          </View>
          <View>
            <TextInput
              aria-disabled
              label="Email"
              editable={false}
              value={currentUser?.email ?? ''}
              style={styles.inputFlex}
            />
          </View>
          {name !== initialName ? (
            <View style={styles.saveRow}>
              <Button
                title="[SAVE]"
                disabled={isSaving}
                isLoading={isSaving}
                onPress={onSavePress}
              />
            </View>
          ) : null}

          {MOBILE_PASSKEY_ENABLED ? (
            <View style={styles.passkeysSection}>
              <Text variant="cardHeader" color="foreground">
                PASSKEYS
              </Text>
              {passkeys.length === 0 ? (
                <Text color="text-tertiary" style={styles.noPasskeysText}>
                  No passkeys registered.
                </Text>
              ) : (
                passkeys.map((pk) => (
                  <View key={pk.id} style={styles.passkeyRow}>
                    <Text color="foreground" style={styles.passkeyName}>
                      {pk.name}
                    </Text>
                    <Pressable
                      onPress={() => onDeletePasskeyPress(pk.id, pk.name)}
                      accessibilityLabel={`Remove passkey ${pk.name}`}
                      accessibilityRole="button"
                      style={styles.passkeyDeleteButton}
                    >
                      <Text color="destructive" style={styles.passkeyDeleteText}>
                        [REMOVE]
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
              <Button
                title={isPasskeyLoading ? '[ADDING...]' : '[ADD_PASSKEY]'}
                disabled={isPasskeyLoading}
                isLoading={isPasskeyLoading}
                onPress={onAddPasskeyPress}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button testID="account-sign-out" title="[SIGN_OUT]" onPress={onLogoutPress} />
        <Button
          title="[DELETE_ACCOUNT]"
          onPress={onDeleteAccountPress}
          style={styles.deleteButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.sm_12,
    paddingTop: theme.spacing.ml_24,
    rowGap: theme.spacing.s_8,
    paddingBottom: theme.spacing.m_16,
  },
  formSection: {
    rowGap: theme.spacing.ml_24,
    marginTop: theme.spacing.l_32,
  },
  inputFlex: {
    flex: 1,
  },
  saveRow: {
    marginTop: theme.spacing.ml_24,
  },
  passkeysSection: {
    rowGap: theme.spacing.s_8,
  },
  noPasskeysText: {
    fontSize: 12,
  },
  passkeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    padding: theme.spacing.s_8,
  },
  passkeyName: {
    fontSize: 12,
  },
  passkeyDeleteButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyDeleteText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: theme.spacing.sm_12,
    paddingTop: theme.spacing.sm_12,
    rowGap: theme.spacing.sm_12,
    borderTopWidth: 1,
    borderTopColor: theme.colors['border-default'],
  },
  deleteButton: {
    borderColor: theme.colors.destructive,
  },
});

export default Account;
