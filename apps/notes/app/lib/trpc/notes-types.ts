import type { AppRouterOutputs, AppRouterInputs } from '@hominem/trpc';

/**
 * Pre-computed notes endpoint output types
 * These help TypeScript avoid re-inferring types repeatedly
 * and provide better IDE autocomplete and performance
 */

// Notes endpoint types
export type NotesListInput = AppRouterInputs['notes']['list'];
export type NotesListOutput = AppRouterOutputs['notes']['list'];
export type NotesGetInput = AppRouterInputs['notes']['get'];
export type NotesGetOutput = AppRouterOutputs['notes']['get'];
export type Note = NotesListOutput['notes'][number];
export type NotesCreateInput = AppRouterInputs['notes']['create'];
export type NotesCreateOutput = AppRouterOutputs['notes']['create'];
export type NotesUpdateInput = AppRouterInputs['notes']['update'];
export type NotesUpdateOutput = AppRouterOutputs['notes']['update'];
export type NotesDeleteInput = AppRouterInputs['notes']['delete'];
export type NotesDeleteOutput = AppRouterOutputs['notes']['delete'];
export type NotesSyncInput = AppRouterInputs['notes']['sync'];
export type NotesSyncOutput = AppRouterOutputs['notes']['sync'];

// Chats endpoint types
export type ChatsCreateInput = AppRouterInputs['chats']['createChat'];
export type ChatsCreateOutput = AppRouterOutputs['chats']['createChat'];
export type ChatsGetInput = AppRouterInputs['chats']['getChatById'];
export type ChatsGetOutput = AppRouterOutputs['chats']['getChatById'];
export type ChatsListInput = AppRouterInputs['chats']['getUserChats'];
export type ChatsListOutput = AppRouterOutputs['chats']['getUserChats'];
export type ChatsUpdateInput = AppRouterInputs['chats']['updateChatTitle'];
export type ChatsUpdateOutput = AppRouterOutputs['chats']['updateChatTitle'];
export type ChatsDeleteInput = AppRouterInputs['chats']['deleteChat'];
export type ChatsDeleteOutput = AppRouterOutputs['chats']['deleteChat'];
export type ChatsSendInput = AppRouterInputs['chats']['send'];
export type ChatsSendOutput = AppRouterOutputs['chats']['send'];

// Messages endpoint types
export type MessagesListInput = AppRouterInputs['chats']['getMessages'];
export type MessagesListOutput = AppRouterOutputs['chats']['getMessages'];
export type MessagesGetInput = AppRouterInputs['messages']['getMessageById'];
export type MessagesGetOutput = AppRouterOutputs['messages']['getMessageById'];
export type MessagesUpdateInput = AppRouterInputs['messages']['updateMessage'];
export type MessagesUpdateOutput = AppRouterOutputs['messages']['updateMessage'];
export type MessagesDeleteInput = AppRouterInputs['messages']['deleteMessage'];
export type MessagesDeleteOutput = AppRouterOutputs['messages']['deleteMessage'];

// Content endpoint types
export type ContentListInput = AppRouterInputs['content']['list'];
export type ContentListOutput = AppRouterOutputs['content']['list'];
export type ContentGetInput = AppRouterInputs['content']['getById'];
export type ContentGetOutput = AppRouterOutputs['content']['getById'];
export type ContentCreateInput = AppRouterInputs['content']['create'];
export type ContentCreateOutput = AppRouterOutputs['content']['create'];
export type ContentUpdateInput = AppRouterInputs['content']['update'];
export type ContentUpdateOutput = AppRouterOutputs['content']['update'];
export type ContentDeleteInput = AppRouterInputs['content']['delete'];
export type ContentDeleteOutput = AppRouterOutputs['content']['delete'];

// Content strategies endpoint types
export type ContentStrategiesListInput = AppRouterInputs['contentStrategies']['list'];
export type ContentStrategiesListOutput = AppRouterOutputs['contentStrategies']['list'];
export type ContentStrategiesGetInput = AppRouterInputs['contentStrategies']['getById'];
export type ContentStrategiesGetOutput = AppRouterOutputs['contentStrategies']['getById'];
export type ContentStrategiesCreateInput = AppRouterInputs['contentStrategies']['create'];
export type ContentStrategiesCreateOutput = AppRouterOutputs['contentStrategies']['create'];
export type ContentStrategiesUpdateInput = AppRouterInputs['contentStrategies']['update'];
export type ContentStrategiesUpdateOutput = AppRouterOutputs['contentStrategies']['update'];
export type ContentStrategiesDeleteInput = AppRouterInputs['contentStrategies']['delete'];
export type ContentStrategiesDeleteOutput = AppRouterOutputs['contentStrategies']['delete'];
export type ContentStrategiesGenerateInput = AppRouterInputs['contentStrategies']['generate'];
export type ContentStrategiesGenerateOutput = AppRouterOutputs['contentStrategies']['generate'];

// Tweet endpoint types
export type TweetGenerateInput = AppRouterInputs['tweet']['generate'];
export type TweetGenerateOutput = AppRouterOutputs['tweet']['generate'];

// Events endpoint types
export type EventsListInput = AppRouterInputs['events']['list'];
export type EventsListOutput = AppRouterOutputs['events']['list'];
export type EventsGetInput = AppRouterInputs['events']['get'];
export type EventsGetOutput = AppRouterOutputs['events']['get'];
export type EventsCreateInput = AppRouterInputs['events']['create'];
export type EventsCreateOutput = AppRouterOutputs['events']['create'];
export type EventsUpdateInput = AppRouterInputs['events']['update'];
export type EventsUpdateOutput = AppRouterOutputs['events']['update'];
export type EventsDeleteInput = AppRouterInputs['events']['delete'];
export type EventsDeleteOutput = AppRouterOutputs['events']['delete'];

// Goals endpoint types
export type GoalsListInput = AppRouterInputs['goals']['list'];
export type GoalsListOutput = AppRouterOutputs['goals']['list'];
export type GoalsGetInput = AppRouterInputs['goals']['get'];
export type GoalsGetOutput = AppRouterOutputs['goals']['get'];
export type GoalsCreateInput = AppRouterInputs['goals']['create'];
export type GoalsCreateOutput = AppRouterOutputs['goals']['create'];
export type GoalsUpdateInput = AppRouterInputs['goals']['update'];
export type GoalsUpdateOutput = AppRouterOutputs['goals']['update'];
export type GoalsDeleteInput = AppRouterInputs['goals']['delete'];
export type GoalsDeleteOutput = AppRouterOutputs['goals']['delete'];
export type GoalsArchiveInput = AppRouterInputs['goals']['archive'];
export type GoalsArchiveOutput = AppRouterOutputs['goals']['archive'];

// People endpoint types
export type PeopleListInput = AppRouterInputs['people']['list'];
export type PeopleListOutput = AppRouterOutputs['people']['list'];
export type PeopleGetInput = AppRouterInputs['people']['get'];
export type PeopleGetOutput = AppRouterOutputs['people']['get'];
export type PeopleCreateInput = AppRouterInputs['people']['create'];
export type PeopleCreateOutput = AppRouterOutputs['people']['create'];
export type PeopleUpdateInput = AppRouterInputs['people']['update'];
export type PeopleUpdateOutput = AppRouterOutputs['people']['update'];
export type PeopleDeleteInput = AppRouterInputs['people']['delete'];
export type PeopleDeleteOutput = AppRouterOutputs['people']['delete'];

// Search endpoint types
export type SearchInput = AppRouterInputs['search']['search'];
export type SearchOutput = AppRouterOutputs['search']['search'];

// Location endpoint types
export type LocationSearchInput = AppRouterInputs['location']['geocode'];
export type LocationSearchOutput = AppRouterOutputs['location']['geocode'];

// Twitter endpoint types
export type TwitterAccountsInput = AppRouterInputs['twitter']['accounts'];
export type TwitterAccountsOutput = AppRouterOutputs['twitter']['accounts'];
export type TwitterAuthorizeInput = AppRouterInputs['twitter']['authorize'];
export type TwitterAuthorizeOutput = AppRouterOutputs['twitter']['authorize'];
export type TwitterDisconnectInput = AppRouterInputs['twitter']['disconnect'];
export type TwitterDisconnectOutput = AppRouterOutputs['twitter']['disconnect'];
export type TwitterTweetInput = AppRouterInputs['twitter']['post'];
export type TwitterTweetOutput = AppRouterOutputs['twitter']['post'];
export type TwitterSyncInput = AppRouterInputs['twitter']['sync'];
export type TwitterSyncOutput = AppRouterOutputs['twitter']['sync'];
