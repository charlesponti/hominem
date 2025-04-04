export const typingMindChats = [
  {
    model: 'gpt-4',
    chatTitle: 'Test Chat',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        role: 'user',
        content: 'Hello',
        createdAt: '2024-01-01T00:00:01Z',
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there!' }],
        createdAt: '2024-01-01T00:00:02Z',
      },
    ],
    chatParams: {
      temperature: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      topP: 1,
      topK: 0,
      maxTokens: 2048,
      promptCachingEnabled: false,
      contextLimit: 10,
      streaming: true,
      outputTone: '',
      outputLanguage: '',
      outputStyle: '',
      outputFormat: '',
      systemMessage: '',
      safetySettings: null,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    syncedAt: '2024-01-01T00:00:00Z',
    chatID: 'test-123',
  },
]

export const typingMindBase = {
  data: {
    chats: typingMindChats,
    folders: [],
    userPrompts: [],
    promptSettings: {},
    userCharacters: [],
    characterSettings: {},
    installedPlugins: [],
    customSearchEngineID: '',
    customSearchAPIKey: '',
    userPluginSettings: {},
    userProfiles: [],
    hiddenButtons: [],
    actionButtonsLabel: true,
    streaming: true,
    automaticTitle: true,
    suggestKeywords: true,
    searchEngine: 'google',
    defaultTemperature: 1,
    defaultPresencePenalty: 0,
    defaultFrequencyPenalty: 0,
    defaultTopP: 1,
    defaultTopK: 0,
    defaultMaxTokens: 2048,
    defaultPromptCachingEnabled: false,
    defaultContextLimit: 10,
    modelIDsOrder: [],
    hiddenModelIDs: [],
    keyboardShortcuts: {
      search: '',
      sidebar: '',
      newChat: '',
      resetChat: '',
      regenerate: '',
      share: '',
      clearContext: '',
      togglePlugins: '',
      copyLastMessage: '',
    },
    customModels: [],
    defaultSafetySettings: null,
  },
}

export const validTypingMindInput = {
  data: {
    ...typingMindBase.data,
    chats: typingMindChats,
  },
}
