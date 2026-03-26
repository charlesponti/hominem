export function getCameraModalComponent(isVisible: boolean) {
  if (!isVisible) {
    return null;
  }

  const { CameraModal } =
    require('../media/camera-modal.tsx') as typeof import('../media/camera-modal');

  return CameraModal;
}

export function getVoiceSessionModalComponent(isVisible: boolean) {
  if (!isVisible) {
    return null;
  }

  const { VoiceSessionModal } =
    require('../media/voice-session-modal.tsx') as typeof import('../media/voice-session-modal');

  return VoiceSessionModal;
}
