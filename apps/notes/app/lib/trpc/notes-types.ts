import type { NotesRouterOutputs, NotesRouterInputs } from '@hominem/trpc';

/**
 * Pre-computed notes endpoint output types
 * These help TypeScript avoid re-inferring types repeatedly
 * and provide better IDE autocomplete and performance
 */

// Notes endpoint types
export type NotesListInput = NotesRouterInputs['notes']['list'];
export type NotesListOutput = NotesRouterOutputs['notes']['list'];
export type NotesGetInput = NotesRouterInputs['notes']['get'];
export type NotesGetOutput = NotesRouterOutputs['notes']['get'];
export type NotesCreateInput = NotesRouterInputs['notes']['create'];
export type NotesCreateOutput = NotesRouterOutputs['notes']['create'];
export type NotesUpdateInput = NotesRouterInputs['notes']['update'];
export type NotesUpdateOutput = NotesRouterOutputs['notes']['update'];
export type NotesDeleteInput = NotesRouterInputs['notes']['delete'];
export type NotesDeleteOutput = NotesRouterOutputs['notes']['delete'];
export type NotesSyncInput = NotesRouterInputs['notes']['sync'];
export type NotesSyncOutput = NotesRouterOutputs['notes']['sync'];

// Chats endpoint types
export type ChatsCreateInput = NotesRouterInputs['chats']['create'];
export type ChatsCreateOutput = NotesRouterOutputs['chats']['create'];
export type ChatsGetInput = NotesRouterInputs['chats']['get'];
export type ChatsGetOutput = NotesRouterOutputs['chats']['get'];
export type ChatsListInput = NotesRouterInputs['chats']['list'];
export type ChatsListOutput = NotesRouterOutputs['chats']['list'];
export type ChatsUpdateInput = NotesRouterInputs['chats']['update'];
export type ChatsUpdateOutput = NotesRouterOutputs['chats']['update'];
export type ChatsDeleteInput = NotesRouterInputs['chats']['delete'];
export type ChatsDeleteOutput = NotesRouterOutputs['chats']['delete'];
export type ChatsSendInput = NotesRouterInputs['chats']['send'];
export type ChatsSendOutput = NotesRouterOutputs['chats']['send'];

// Messages endpoint types
export type MessagesListInput = NotesRouterInputs['messages']['list'];
export type MessagesListOutput = NotesRouterOutputs['messages']['list'];
export type MessagesGetInput = NotesRouterInputs['messages']['get'];
export type MessagesGetOutput = NotesRouterOutputs['messages']['get'];
export type MessagesCreateInput = NotesRouterInputs['messages']['create'];
export type MessagesCreateOutput = NotesRouterOutputs['messages']['create'];
export type MessagesUpdateInput = NotesRouterInputs['messages']['update'];
export type MessagesUpdateOutput = NotesRouterOutputs['messages']['update'];
export type MessagesDeleteInput = NotesRouterInputs['messages']['delete'];
export type MessagesDeleteOutput = NotesRouterOutputs['messages']['delete'];

// Content endpoint types
export type ContentListInput = NotesRouterInputs['content']['list'];
export type ContentListOutput = NotesRouterOutputs['content']['list'];
export type ContentGetInput = NotesRouterInputs['content']['get'];
export type ContentGetOutput = NotesRouterOutputs['content']['get'];
export type ContentCreateInput = NotesRouterInputs['content']['create'];
export type ContentCreateOutput = NotesRouterOutputs['content']['create'];
export type ContentUpdateInput = NotesRouterInputs['content']['update'];
export type ContentUpdateOutput = NotesRouterOutputs['content']['update'];
export type ContentDeleteInput = NotesRouterInputs['content']['delete'];
export type ContentDeleteOutput = NotesRouterOutputs['content']['delete'];

// Content strategies endpoint types
export type ContentStrategiesListInput = NotesRouterInputs['contentStrategies']['list'];
export type ContentStrategiesListOutput = NotesRouterOutputs['contentStrategies']['list'];
export type ContentStrategiesGetInput = NotesRouterInputs['contentStrategies']['get'];
export type ContentStrategiesGetOutput = NotesRouterOutputs['contentStrategies']['get'];
export type ContentStrategiesCreateInput = NotesRouterInputs['contentStrategies']['create'];
export type ContentStrategiesCreateOutput = NotesRouterOutputs['contentStrategies']['create'];
export type ContentStrategiesUpdateInput = NotesRouterInputs['contentStrategies']['update'];
export type ContentStrategiesUpdateOutput = NotesRouterOutputs['contentStrategies']['update'];
export type ContentStrategiesDeleteInput = NotesRouterInputs['contentStrategies']['delete'];
export type ContentStrategiesDeleteOutput = NotesRouterOutputs['contentStrategies']['delete'];

// Tweet endpoint types
export type TweetListInput = NotesRouterInputs['tweet']['list'];
export type TweetListOutput = NotesRouterOutputs['tweet']['list'];
export type TweetGetInput = NotesRouterInputs['tweet']['get'];
export type TweetGetOutput = NotesRouterOutputs['tweet']['get'];

// Events endpoint types
export type EventsListInput = NotesRouterInputs['events']['list'];
export type EventsListOutput = NotesRouterOutputs['events']['list'];
export type EventsGetInput = NotesRouterInputs['events']['get'];
export type EventsGetOutput = NotesRouterOutputs['events']['get'];
export type EventsCreateInput = NotesRouterInputs['events']['create'];
export type EventsCreateOutput = NotesRouterOutputs['events']['create'];
export type EventsUpdateInput = NotesRouterInputs['events']['update'];
export type EventsUpdateOutput = NotesRouterOutputs['events']['update'];
export type EventsDeleteInput = NotesRouterInputs['events']['delete'];
export type EventsDeleteOutput = NotesRouterOutputs['events']['delete'];

// Goals endpoint types
export type GoalsListInput = NotesRouterInputs['goals']['list'];
export type GoalsListOutput = NotesRouterOutputs['goals']['list'];
export type GoalsGetInput = NotesRouterInputs['goals']['get'];
export type GoalsGetOutput = NotesRouterOutputs['goals']['get'];
export type GoalsCreateInput = NotesRouterInputs['goals']['create'];
export type GoalsCreateOutput = NotesRouterOutputs['goals']['create'];
export type GoalsUpdateInput = NotesRouterInputs['goals']['update'];
export type GoalsUpdateOutput = NotesRouterOutputs['goals']['update'];
export type GoalsDeleteInput = NotesRouterInputs['goals']['delete'];
export type GoalsDeleteOutput = NotesRouterOutputs['goals']['delete'];

// People endpoint types
export type PeopleListInput = NotesRouterInputs['people']['list'];
export type PeopleListOutput = NotesRouterOutputs['people']['list'];
export type PeopleGetInput = NotesRouterInputs['people']['get'];
export type PeopleGetOutput = NotesRouterOutputs['people']['get'];

// Search endpoint types
export type SearchInput = NotesRouterInputs['search']['search'];
export type SearchOutput = NotesRouterOutputs['search']['search'];

// Location endpoint types
export type LocationSearchInput = NotesRouterInputs['location']['search'];
export type LocationSearchOutput = NotesRouterOutputs['location']['search'];

// Twitter endpoint types
export type TwitterSearchInput = NotesRouterInputs['twitter']['search'];
export type TwitterSearchOutput = NotesRouterOutputs['twitter']['search'];
export type TwitterTweetInput = NotesRouterInputs['twitter']['tweet'];
export type TwitterTweetOutput = NotesRouterOutputs['twitter']['tweet'];
