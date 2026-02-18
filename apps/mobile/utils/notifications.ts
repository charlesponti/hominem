export async function registerForPushNotificationsAsync() {
  const Notifications = await import('expo-notifications')
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}
