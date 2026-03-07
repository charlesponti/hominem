import { useEffect, useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { View } from 'react-native';

import { Button } from '~/components/Button';
import TextInput from '~/components/text-input';
import { Text } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { useMobilePasskeyAuth } from '~/utils/use-mobile-passkey-auth';

function Account() {
  const { isSignedIn, signOut, currentUser, updateProfile } = useAuth();
  const { addPasskey, listPasskeys, deletePasskey, isLoading: isPasskeyLoading } = useMobilePasskeyAuth();
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
    if (isSignedIn) {
      listPasskeys().then(setPasskeys).catch(() => undefined);
    }
  }, [isSignedIn, listPasskeys]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <View
      testID="account-screen"
      style={{
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 24,
        rowGap: 8,
        backgroundColor: '#000000',
      }}
    >
      <Text variant="cardHeader" color="foreground">
        ACCOUNT
      </Text>
      <View style={{ rowGap: 24, marginTop: 32 }}>
        <View>
          <TextInput
            aria-disabled
            label="Name"
            placeholder="ENTER NAME"
            value={name}
            style={{ flex: 1 }}
            onChange={(e) => setName(e.nativeEvent.text)}
          />
        </View>
        <View>
          <TextInput
            aria-disabled
            label="Email"
            editable={false}
            value={currentUser?.email ?? ''}
            style={{ flex: 1 }}
          />
        </View>
        {name !== initialName ? (
          <View style={{ marginTop: 24 }}>
            <Button title="[SAVE]" disabled={isSaving} isLoading={isSaving} onPress={onSavePress} />
          </View>
        ) : null}

        {/* Passkey management */}
        <View style={{ rowGap: 8 }}>
          <Text variant="cardHeader" color="foreground">
            PASSKEYS
          </Text>
          {passkeys.length === 0 ? (
            <Text color="mutedForeground" style={{ fontSize: 12 }}>
              No passkeys registered.
            </Text>
          ) : (
            passkeys.map((pk) => (
              <View
                key={pk.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#333',
                  padding: 8,
                }}
              >
                <Text color="foreground" style={{ fontSize: 12 }}>
                  {pk.name}
                </Text>
                <TouchableOpacity onPress={() => onDeletePasskeyPress(pk.id, pk.name)}>
                  <Text color="destructive" style={{ fontSize: 12 }}>
                    [REMOVE]
                  </Text>
                </TouchableOpacity>
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
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 50,
          left: 12,
          alignItems: 'center',
          width: '100%',
          rowGap: 12,
        }}
      >
        <Button testID="account-sign-out" title="[SIGN_OUT]" onPress={onLogoutPress} />
        <Button
          title="[DELETE_ACCOUNT]"
          onPress={onDeleteAccountPress}
          style={{ borderColor: '#FF0000' }}
        />
      </View>
    </View>
  );
}

export default Account;
