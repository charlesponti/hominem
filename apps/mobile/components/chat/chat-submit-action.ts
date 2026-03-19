export function runChatSubmitAction(input: {
  message: string;
  sendChatMessage: (messageText: string) => Promise<unknown>;
  setMessage: (value: string) => void;
}) {
  const trimmedMessage = input.message.trim();
  if (!trimmedMessage) {
    return false;
  }

  void input.sendChatMessage(trimmedMessage);
  input.setMessage('');
  return true;
}
