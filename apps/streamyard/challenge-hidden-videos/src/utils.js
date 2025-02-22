/**
 *
 * @param {{ isSelf: boolean }} streamId
 */
export default function generateNotificationText(streams) {
  // add streamId to hidden speakers
  const hiddenVideos = streams.filter((s) => !s.isVideoOn)
  const isSelfHidden = !!hiddenVideos.find((s) => s.isSelf && !s.isVideoOn)
  const isAnd = hiddenVideos.length - 1 !== 0
  const withoutMe = hiddenVideos.length - 1

  if (hiddenVideos.length === 0) return ''

  // - You and one guest are hidden -> "You and 1 other are in the stream with audio only"
  // - You and multiple guests are hidden -> "You and {x} others are in the stream with audio only"
  // - Only 1 guest is hidden -> "{name} is in the stream with audio only"
  // - Multiple guests are hidden -> "{x} others are in the stream with audio only"
  const base = `is in the stream with audio only`

  if (!isSelfHidden) {
    if (hiddenVideos.length === 1) return `${hiddenVideos[0].name} ${base}`
    return `${hiddenVideos.length} others are in the stream with audio only`
  }

  if (isAnd) {
    return `You and ${withoutMe} other${withoutMe ? 's' : ''} are in the stream with audio only`
  }

  return `You are the stream with audio only`
}
