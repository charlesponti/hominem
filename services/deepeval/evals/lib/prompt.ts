import { readFileSync } from 'node:fs';

export type ChatMessage = { role: string; content: string };

export function loadJsonPrompt(path: string): ChatMessage[] {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadTextPrompt(path: string): string {
  return readFileSync(path, 'utf8');
}

export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*([^}]+?)\s*}}/g, (_, key: string) => vars[key.trim()] ?? '');
}

export function renderMessages(
  messages: ChatMessage[],
  vars: Record<string, string>,
): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: render(message.content, vars),
  }));
}
