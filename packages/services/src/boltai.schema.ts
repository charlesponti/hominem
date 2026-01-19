import { z } from 'zod'

export const BoltMessageSchema = z.object({
  isImage: z.boolean().default(false),
  conversationId: z.number(),
  role: z.string(),
  content: z.string(),
  remoteImageURL: z.string().default(''),
  model: z.string().default(''),
  provider: z.string().default('Unknown'),
  createdAt: z.number(),
  imageURLs: z.array(z.string()).default([]),
  toolUseId: z.string(),
})

export const BoltConversationSchema = z.object({
  contextSince: z.number().default(-978307200),
  messages: z.array(BoltMessageSchema),
  useWebBrowsing: z.boolean().default(false),
  isInline: z.boolean().default(false),
  model: z.string().default(''),
  id: z.number(),
  tone: z.string().default(''),
  writingStyle: z.string().default(''),
  customModelId: z.number().default(0),
  format: z.string().default(''),
  archived: z.boolean().default(false),
  temperature: z.number().default(1),
  systemInstruction: z.string().default(''),
  favorited: z.boolean().default(false),
  contextLimit: z.number().default(10),
  title: z.string(),
  useWebSearch: z.boolean().default(false),
  frequencyPenalty: z.number().default(0),
  languageCode: z.string().default(''),
  presencePenalty: z.number().default(0),
  plugins: z.array(z.string()).default([]),
})

export const BoltExportSchema = z.object({
  chats: z.array(BoltConversationSchema),
  assistants: z
    .array(
      z.object({
        model: z.string(),
        customModelId: z.number().default(0),
        enable: z.boolean().default(true),
        icon: z.string().default(''),
        temperature: z.number().default(1),
        displayId: z.string(),
        name: z.string(),
        instruction: z.string().default(''),
        sortOrder: z.number().default(0),
        frequencyPenalty: z.number().default(0),
        languageCode: z.string().default('en-us'),
        presencePenalty: z.number().default(0),
        label: z.string(),
      })
    )
    .default([]),
  folders: z
    .array(
      z.object({
        name: z.string(),
        id: z.number(),
      })
    )
    .default([]),
  version: z.number().default(3),
  preferences: z
    .object({
      setappAIPlan: z.string().default('free'),
      autoCollapseLongPrompt: z.boolean().default(true),
      hideDockIcon: z.boolean().default(false),
      networkTimeoutInterval: z.number().default(600),
    })
    .passthrough()
    .default(() => ({
      setappAIPlan: 'free',
      autoCollapseLongPrompt: true,
      hideDockIcon: false,
      networkTimeoutInterval: 600,
    })),
  commands: z.array(z.any()).default([]),
  memories: z.array(z.any()).default([]),
  services: z
    .array(
      z
        .object({
          contextLength: z.number().default(0),
          apiKey: z.string().default(''),
          id: z.number(),
          name: z.string(),
          useStream: z.boolean().default(true),
          modelId: z.string(),
          provider: z.string(),
          apiEndpoint: z.string(),
        })
        .passthrough()
    )
    .default([]),
  prompts: z.array(z.any()).default([]),
})

export type BoltMessage = z.infer<typeof BoltMessageSchema>
export type BoltConversation = z.infer<typeof BoltConversationSchema>
export type BoltExport = z.infer<typeof BoltExportSchema>
