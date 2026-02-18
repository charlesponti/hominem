import { Alert } from 'react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Button } from '~/components/Button'
import TextInput from '~/components/text-input'
import { Text } from '~/theme'
import { useAuth } from '~/utils/auth-provider'

function Account() {
  const { isSignedIn, signOut, currentUser, updateProfile } = useAuth()
  const initialName = currentUser?.name || ''
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  // const [avatarUrl, setAvatarUrl] = useState('')

  // const onAvatarUpload = (url: string) => {
  //   setAvatarUrl(url)
  // }

  const onSavePress = () => {
    setIsSaving(true)
    updateProfile({ name })
      .catch(() => undefined)
      .finally(() => setIsSaving(false))
  }

  const onLogoutPress = () => {
    signOut()
  }

  const onDeleteAccountPress = () => {
    Alert.alert(
      'Account deletion unavailable',
      'Account deletion is not available in this release yet.',
      [
        { text: 'OK', style: 'default' },
      ]
    )
  }

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name)
      // setAvatarUrl(profile.avatarUrl)
    }
  }, [currentUser])

  if (!isSignedIn) {
    return null
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 24, rowGap: 8 }}>
      <Text variant="cardHeader">Your account</Text>
      {/* <Avatar size={200} url={avatarUrl || ''} onUpload={onAvatarUpload} /> */}
      <View style={{ rowGap: 24, marginTop: 32 }}>
        <View>
          <TextInput
            aria-disabled
            label="Name"
            placeholder="Enter your name"
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
            <Button title="Save" disabled={isSaving} isLoading={isSaving} onPress={onSavePress} />
          </View>
        ) : null}
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
        <Button title="Sign out" onPress={onLogoutPress} />
        <Button title="Delete account" onPress={onDeleteAccountPress} />
      </View>
    </View>
  )
}

export default Account
