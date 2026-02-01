export interface SearchContextPreviewProps {
  searchContext: string;
  onRemove: () => void;
}

export interface SearchResponse {
  success: boolean;
  context?: string | undefined;
  error?: string | undefined;
  query?: string | undefined;
  results?: SearchResult[] | undefined;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}
