import { z } from 'zod'

// Define schemas for nested objects first
const ModelInfoSchema = z.object({
  title: z.string(),
  id: z.string(),
})

const ChatParamsSchema = z.object({
  temperature: z.number().nullable(),
  presencePenalty: z.number().nullable(),
  frequencyPenalty: z.number().nullable(),
  topP: z.number().nullable(),
  topK: z.number().nullable(),
  maxTokens: z.number().nullable(),
  safetySettings: z.any().nullable(),
  promptCachingEnabled: z.boolean(),
  contextLimit: z.number(),
  streaming: z.boolean(),
  outputTone: z.string(),
  outputLanguage: z.string(),
  outputStyle: z.string(),
  outputFormat: z.string(),
  showOutputSettings: z.union([z.boolean(), z.string()]).optional(),
  systemMessage: z.string(),
})

const UsageSchema = z.object({
  completion_tokens: z.number(),
  prompt_tokens: z.number(),
  total_tokens: z.number(),
})

const ContentItemSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.enum(['image_url', 'tm_image_file', 'tm_text_file']),
    image_url: z.any(), // Could be more specific if needed
  }),
])

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.union([z.string(), z.array(ContentItemSchema)]),
  createdAt: z.string().datetime().optional(),
  uuid: z.uuid().optional(),
  contextClearedAt: z.string().datetime().optional(),
  // Optional fields for assistant messages
  refusal: z.any().nullable().optional(),
  usage: UsageSchema.optional(),
  model: z.string().optional(),
  titleUsage: UsageSchema.optional(),
  keywords: z.array(z.string()).optional(),
})

// Main chat entry schema
const ChatEntrySchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  modelInfo: ModelInfoSchema.optional(),
  preview: z.string().optional(),
  linkedPlugins: z.array(z.string()).optional(),
  chatParams: ChatParamsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncedAt: z.string().datetime().nullable(),
  chatID: z.string(),
  messages: z.array(MessageSchema),
  chatTitle: z.string(),
})

// Define basic types
const IdSchema = z.string()
const DateSchema = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: 'Invalid date format',
})

// Folder schema
const FolderSchema = z.object({
  id: IdSchema,
  title: z.string(),
  new: z.boolean(),
  open: z.boolean(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  syncedAt: DateSchema.nullable(),
  order: z.number(),
})

// User prompt schema (appears to be an empty array in your data)
const UserPromptSchema = z.object({}).passthrough()

// User character schema
const UserCharacterSchema = z.object({
  title: z.string(),
  pinned: z.boolean(),
  avatarURL: z.string(),
  description: z.string(),
  instruction: z.string(),
  overrideSystemInstruction: z.boolean(),
  trainingExamples: z.array(z.unknown()),
  conversationStarters: z.array(z.unknown()),
  welcomeMessage: z.string(),
  userTags: z.array(z.string()),
  categories: z.array(z.string()),
  isExcludedForUserTags: z.boolean(),
  isEnforceDefaultModel: z.boolean(),
  trainingDataTags: z.array(z.string()),
  isEnforceAssignedPlugins: z.boolean(),
  assignedPlugins: z.record(z.string(), z.unknown()),
  isEnforceSpeechSettings: z.boolean(),
  isEnforceModelParameters: z.boolean(),
  dynamicContextEndpoints: z.array(z.unknown()),
  appliedLimits: z.array(z.unknown()),
  id: IdSchema,
  type: z.string(),
  color: z.string(),
  createdAt: DateSchema,
  lastUsedAt: DateSchema,
  syncedAt: DateSchema.nullable(),
})

// Keyboard shortcuts schema
const KeyboardShortcutsSchema = z.object({
  search: z.string(),
  sidebar: z.string(),
  newChat: z.string(),
  resetChat: z.string(),
  regenerate: z.string(),
  share: z.string(),
  clearContext: z.string(),
  togglePlugins: z.string(),
  copyLastMessage: z.string(),
})

// The root schema is an array of chat entries
const TypingMindExportSchema = z.object({
  data: z.object({
    chats: z.array(ChatEntrySchema).nonempty(),
    folders: z.array(FolderSchema),
    userPrompts: z.array(UserPromptSchema),
    promptSettings: z.record(z.string(), z.unknown()),
    userCharacters: z.array(UserCharacterSchema),
    characterSettings: z.record(z.string(), z.unknown()),
    installedPlugins: z.array(z.unknown()),
    customSearchEngineID: z.string(),
    customSearchAPIKey: z.string(),
    userPluginSettings: z.record(z.string(), z.unknown()),
    userProfiles: z.array(z.unknown()),
    hiddenButtons: z.array(z.unknown()),
    actionButtonsLabel: z.boolean(),
    streaming: z.boolean(),
    automaticTitle: z.boolean(),
    suggestKeywords: z.boolean(),
    searchEngine: z.string(),
    defaultTemperature: z.number().nullable(),
    defaultPresencePenalty: z.number().nullable(),
    defaultFrequencyPenalty: z.number().nullable(),
    defaultTopP: z.number().nullable(),
    defaultTopK: z.number().nullable(),
    defaultMaxTokens: z.number().nullable(),
    defaultSafetySettings: z.unknown().nullable(),
    defaultPromptCachingEnabled: z.boolean(),
    defaultContextLimit: z.number(),
    modelIDsOrder: z.array(z.string()),
    hiddenModelIDs: z.array(z.string()),
    keyboardShortcuts: KeyboardShortcutsSchema,
    customModels: z.array(z.unknown()),
  }),
})

// Export the schema
export type TypingMindConfig = z.infer<typeof TypingMindExportSchema>
export { TypingMindExportSchema }
