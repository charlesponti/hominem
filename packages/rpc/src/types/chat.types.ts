import type { InferRequestType, InferResponseType } from 'hono/client';

export type {
  ArtifactType,
  ChatMessageItem,
  MarkdownComponent,
  SessionSource,
  CaptureLifecycleState,
} from '@hominem/chat/types';

export {
  CHAT_TITLE_MAX_LENGTH,
  ENABLED_ARTIFACT_TYPES,
  isArtifactTypeEnabled,
} from '@hominem/chat/types';

import type { HonoClient } from '../core/api-client';

// ============================================================================
// LIST
// ============================================================================

type _ChatsListEndpoint = HonoClient['api']['chats']['$get'];
export type ChatsListOutput = InferResponseType<_ChatsListEndpoint, 200>;
export type Chat = ChatsListOutput['items'][number] & { archivedAt: string | null };

// ============================================================================
// CREATE
// ============================================================================

type _ChatsCreateEndpoint = HonoClient['api']['chats']['$post'];
export type ChatsCreateInput = InferRequestType<_ChatsCreateEndpoint>['json'];
export type ChatsCreateOutput = InferResponseType<_ChatsCreateEndpoint, 201>;

// ============================================================================
// START STREAM
// ============================================================================

type _ChatsStartStreamEndpoint = HonoClient['api']['chats']['start-stream']['$post'];
export type ChatsStartStreamInput = InferRequestType<_ChatsStartStreamEndpoint>['json'];

// ============================================================================
// GET (with messages)
// ============================================================================

type _ChatsGetEndpoint = HonoClient['api']['chats'][':id']['$get'];
export type ChatsGetOutput = InferResponseType<_ChatsGetEndpoint, 200>;
export type ChatMessageDto = ChatsGetOutput['messages'][number];
export type ChatMessageFileDto = NonNullable<ChatMessageDto['files']>[number];
export type ChatWithMessages = Chat & { messages: ChatMessageDto[] };

// ============================================================================
// UPDATE
// ============================================================================

type _ChatsUpdateEndpoint = HonoClient['api']['chats'][':id']['$patch'];
export type ChatsUpdateInput = InferRequestType<_ChatsUpdateEndpoint>['json'];
export type ChatsUpdateOutput = InferResponseType<_ChatsUpdateEndpoint, 200>;

// ============================================================================
// ARCHIVE
// ============================================================================

type _ChatsArchiveEndpoint = HonoClient['api']['chats'][':id']['archive']['$post'];
export type ChatsArchiveOutput = InferResponseType<_ChatsArchiveEndpoint, 200>;

// ============================================================================
// MESSAGES
// ============================================================================

type _ChatsMessagesEndpoint = HonoClient['api']['chats'][':id']['messages']['$get'];
export type ChatsGetMessagesOutput = InferResponseType<_ChatsMessagesEndpoint, 200>;

type _ChatsSearchMessagesEndpoint = HonoClient['api']['chats'][':id']['messages']['search']['$get'];
export type ChatsSearchMessagesInput = InferRequestType<_ChatsSearchMessagesEndpoint>['query'];
export type ChatsSearchMessagesOutput = InferResponseType<_ChatsSearchMessagesEndpoint, 200>;

// ============================================================================
// STREAM (send message)
// ============================================================================

type _ChatsStreamEndpoint = HonoClient['api']['chats'][':id']['stream']['$post'];
export type ChatsSendInput = InferRequestType<_ChatsStreamEndpoint>['json'];

// ============================================================================
// SOURCES (chat-level attached notes)
// ============================================================================

type _ChatsListSourcesEndpoint = HonoClient['api']['chats'][':id']['sources']['$get'];
export type ChatsListSourcesOutput = InferResponseType<_ChatsListSourcesEndpoint, 200>;
export type ChatSourceDto = ChatsListSourcesOutput[number];

type _ChatsAddSourceEndpoint = HonoClient['api']['chats'][':id']['sources']['$post'];
export type ChatsAddSourceInput = InferRequestType<_ChatsAddSourceEndpoint>['json'];
export type ChatsAddSourceOutput = InferResponseType<_ChatsAddSourceEndpoint, 201>;

type _ChatsRemoveSourceEndpoint =
  HonoClient['api']['chats'][':id']['sources'][':noteId']['$delete'];
export type ChatsRemoveSourceOutput = InferResponseType<_ChatsRemoveSourceEndpoint, 200>;
