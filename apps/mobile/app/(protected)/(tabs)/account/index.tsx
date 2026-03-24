import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { useEffect, useReducer } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import TextInput from '~/components/text-input';
import { getAppLockEnabled, setAppLockEnabled } from '~/lib/use-app-lock';
import { getPreventScreenshots, setPreventScreenshots } from '~/lib/use-screen-capture';
import { Text, theme } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { MOBILE_PASSKEY_ENABLED } from '~/utils/constants';
import { useMobilePasskeyAuth } from '~/utils/use-mobile-passkey-auth';

interface AccountState {
  name: string;
  isSaving: boolean;
  passkeys: { id: string; name: string }[];
  preventScreenshots: boolean;
  appLock: boolean;
}

type AccountAction =
  | { type: 'set-name'; name: string }
  | { type: 'set-saving'; isSaving: boolean }
  | { type: 'set-passkeys'; passkeys: { id: string; name: string }[] }
  | { type: 'remove-passkey'; passkeyId: string }
  | { type: 'set-prevent-screenshots'; preventScreenshots: boolean }
  | { type: 'set-app-lock'; appLock: boolean };

function createInitialAccountState(name: string): AccountState {
  return {
    name,
    isSaving: false,
    passkeys: [],
    preventScreenshots: getPreventScreenshots(),
    appLock: getAppLockEnabled(),
  };
}

function accountReducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case 'set-name':
      return {
        ...state,
        name: action.name,
      };
    case 'set-saving':
      return {
        ...state,
        isSaving: action.isSaving,
      };
    case 'set-passkeys':
      return {
        ...state,
        passkeys: action.passkeys,
      };
    case 'remove-passkey':
      return {
        ...state,
        passkeys: state.passkeys.filter((passkey) => passkey.id !== action.passkeyId),
      };
    case 'set-prevent-screenshots':
      return {
        ...state,
        preventScreenshots: action.preventScreenshots,
      };
    case 'set-app-lock':
      return {
        ...state,
        appLock: action.appLock,
      };
  }
}

function Account() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, signOut, currentUser, updateProfile } = useAuth();
  const {
    addPasskey,
    listPasskeys,
    deletePasskey,
    isLoading: isPasskeyLoading,
  } = useMobilePasskeyAuth();
  const initialName = currentUser?.name ?? '';
  const [state, dispatch] = useReducer(accountReducer, initialName, createInitialAccountState);

  const onSavePress = () => {
    dispatch({ type: 'set-saving', isSaving: true });
    updateProfile({ name: state.name })
      .catch(() => undefined)
      .finally(() => dispatch({ type: 'set-saving', isSaving: false }));
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

  const onArchivedChatsPress = () => {
    router.push('/(protected)/(tabs)/account/archived-chats' as RelativePathString);
  };

  const onAddPasskeyPress = async () => {
    const result = await addPasskey();
    if (result.success) {
      const updated = await listPasskeys();
      dispatch({ type: 'set-passkeys', passkeys: updated });
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
            dispatch({ type: 'remove-passkey', passkeyId: id });
          } else {
            Alert.alert('Error', result.error ?? 'Could not remove passkey.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (!MOBILE_PASSKEY_ENABLED) {
      dispatch({ type: 'set-passkeys', passkeys: [] });
      return;
    }
    if (isSignedIn) {
      listPasskeys()
        .then((passkeys) => dispatch({ type: 'set-passkeys', passkeys }))
        .catch(() => undefined);
    }
  }, [isSignedIn, listPasskeys]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <View testID="account-screen" style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="cardHeader" color="foreground">
          ACCOUNT
        </Text>
        <View style={styles.formSection}>
          <View style={styles.sectionCard}>
            <Text variant="cardHeader" color="foreground">
              CHAT HISTORY
            </Text>
            <Text color="text-tertiary" style={styles.sectionDescription}>
              Archived chats live outside inbox so current work stays focused.
            </Text>
            <Button title="[ARCHIVED_CHATS]" onPress={onArchivedChatsPress} />
          </View>
          <View>
            <TextInput
              aria-disabled
              label="Name"
              placeholder="ENTER NAME"
              value={state.name}
              style={styles.inputFlex}
              onChange={(e) => dispatch({ type: 'set-name', name: e.nativeEvent.text })}
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
          {state.name !== initialName ? (
            <View style={styles.saveRow}>
              <Button
                title="[SAVE]"
                disabled={state.isSaving}
                isLoading={state.isSaving}
                onPress={onSavePress}
              />
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text variant="cardHeader" color="foreground">
              PRIVACY
            </Text>
            <View style={styles.settingRow}>
              <Text color="foreground">Prevent screenshots</Text>
              <Switch
                value={state.preventScreenshots}
                onValueChange={(value) => {
                  dispatch({ type: 'set-prevent-screenshots', preventScreenshots: value });
                  setPreventScreenshots(value);
                }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text color="foreground">Lock with Face ID</Text>
              <Switch
                value={state.appLock}
                onValueChange={(value) => {
                  dispatch({ type: 'set-app-lock', appLock: value });
                  setAppLockEnabled(value);
                }}
              />
            </View>
          </View>

          {MOBILE_PASSKEY_ENABLED ? (
            <View style={styles.passkeysSection}>
              <Text variant="cardHeader" color="foreground">
                PASSKEYS
              </Text>
              {state.passkeys.length === 0 ? (
                <Text color="text-tertiary" style={styles.noPasskeysText}>
                  No passkeys registered.
                </Text>
              ) : (
                state.passkeys.map((pk) => (
                  <View key={pk.id} style={styles.passkeyRow}>
                    <Text color="foreground" style={styles.passkeyName}>
                      {pk.name}
                    </Text>
                    <Button
                      variant="ghost"
                      size="xs"
                      onPress={() => onDeletePasskeyPress(pk.id, pk.name)}
                      accessibilityLabel={`Remove passkey ${pk.name}`}
                      style={styles.passkeyDeleteButton}
                      title="[REMOVE]"
                    />
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
    rowGap: theme.spacing.sm_8,
    paddingBottom: theme.spacing.m_16,
  },
  formSection: {
    rowGap: theme.spacing.ml_24,
    marginTop: theme.spacing.l_32,
  },
  sectionCard: {
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    padding: theme.spacing.m_16,
    rowGap: theme.spacing.sm_8,
  },
  sectionDescription: {
    fontSize: 12,
  },
  inputFlex: {
    flex: 1,
  },
  saveRow: {
    marginTop: theme.spacing.ml_24,
  },
  passkeysSection: {
    rowGap: theme.spacing.sm_8,
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
    padding: theme.spacing.sm_8,
  },
  passkeyName: {
    fontSize: 12,
  },
  passkeyDeleteButton: {
    minWidth: 72,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
