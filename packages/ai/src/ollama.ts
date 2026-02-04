import { createOllama } from 'ollama-ai-provider';

export const ollama = createOllama();

export type Ollama = ReturnType<typeof createOllama>;
