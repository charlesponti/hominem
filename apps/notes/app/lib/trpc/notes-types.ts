// Placeholder types for Hono RPC client
// These will be replaced with proper Hono RPC types once client is updated

export type NotesListInput = { types?: string[]; query?: string; tags?: string[]; limit?: number };
export type NotesListOutput = { notes: Array<any> };
export type NotesGetInput = { id: string };
export type NotesGetOutput = any;
export type Note = any;
export type NotesCreateInput = { title?: string; content: string; tags?: Array<{ value: string }> };
export type NotesCreateOutput = any;
export type NotesUpdateInput = { id: string; title?: string; content?: string };
export type NotesUpdateOutput = any;
export type NotesDeleteInput = { id: string };
export type NotesDeleteOutput = any;
export type NotesSyncInput = { items: any[] };
export type NotesSyncOutput = any;

export type ChatsCreateInput = { title: string };
export type ChatsCreateOutput = any;
export type ChatsGetInput = { chatId: string };
export type ChatsGetOutput = any;
export type ChatsListInput = { limit?: number };
export type ChatsListOutput = any;
export type ChatsUpdateInput = { chatId: string; title: string };
export type ChatsUpdateOutput = any;
export type ChatsDeleteInput = { chatId: string };
export type ChatsDeleteOutput = any;
export type ChatsSendInput = { message: string; chatId?: string };
export type ChatsSendOutput = any;

export type MessagesListInput = { chatId: string; limit?: number };
export type MessagesListOutput = any;
export type MessagesGetInput = { messageId: string };
export type MessagesGetOutput = any;
export type MessagesUpdateInput = { messageId: string; content: string };
export type MessagesUpdateOutput = any;
export type MessagesDeleteInput = { messageId: string };
export type MessagesDeleteOutput = any;

export type ContentListInput = { limit?: number };
export type ContentListOutput = { items: Array<any> };
export type ContentGetInput = { id: string };
export type ContentGetOutput = any;
export type ContentCreateInput = { title: string; description?: string };
export type ContentCreateOutput = any;
export type ContentUpdateInput = { id: string };
export type ContentUpdateOutput = any;
export type ContentDeleteInput = { id: string };
export type ContentDeleteOutput = any;

export type ContentStrategiesListInput = {};
export type ContentStrategiesListOutput = any;
export type ContentStrategiesGetInput = { id: string };
export type ContentStrategiesGetOutput = any;
export type ContentStrategiesCreateInput = any;
export type ContentStrategiesCreateOutput = any;
export type ContentStrategiesUpdateInput = { id: string };
export type ContentStrategiesUpdateOutput = any;
export type ContentStrategiesDeleteInput = { id: string };
export type ContentStrategiesDeleteOutput = any;
export type ContentStrategiesGenerateInput = any;
export type ContentStrategiesGenerateOutput = any;

export type TweetGenerateInput = any;
export type TweetGenerateOutput = any;

export type EventsListInput = {};
export type EventsListOutput = any;
export type EventsGetInput = { id: string };
export type EventsGetOutput = any;
export type EventsCreateInput = { title: string; date?: string };
export type EventsCreateOutput = any;
export type EventsUpdateInput = { id: string };
export type EventsUpdateOutput = any;
export type EventsDeleteInput = { id: string };
export type EventsDeleteOutput = any;

export type GoalsListInput = {};
export type GoalsListOutput = any;
export type GoalsGetInput = { id: string };
export type GoalsGetOutput = any;
export type GoalsCreateInput = { title: string };
export type GoalsCreateOutput = any;
export type GoalsUpdateInput = { id: string };
export type GoalsUpdateOutput = any;
export type GoalsDeleteInput = { id: string };
export type GoalsDeleteOutput = any;
export type GoalsArchiveInput = { id: string };
export type GoalsArchiveOutput = any;

export type SearchInput = { query: string };
export type SearchOutput = any;

export type LocationSearchInput = { address: string };
export type LocationSearchOutput = any;

export type TwitterAccountsInput = {};
export type TwitterAccountsOutput = any;
export type TwitterAuthorizeInput = any;
export type TwitterAuthorizeOutput = any;
export type TwitterDisconnectInput = { accountId: string };
export type TwitterDisconnectOutput = any;
export type TwitterTweetInput = { content: string };
export type TwitterTweetOutput = any;
export type TwitterSyncInput = {};
export type TwitterSyncOutput = any;
