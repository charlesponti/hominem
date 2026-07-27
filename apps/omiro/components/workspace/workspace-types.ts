export type WorkspaceContext = 'chats' | 'notes' | 'time';

export interface ContentWorkspaceSnapshot {
  isSearching: boolean;
  scrollOffset: number;
  searchQuery: string;
}

export const initialContentWorkspaceSnapshot = (): ContentWorkspaceSnapshot => ({
  isSearching: false,
  scrollOffset: 0,
  searchQuery: '',
});
