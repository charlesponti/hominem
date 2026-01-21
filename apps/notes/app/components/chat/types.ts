export interface SearchContextPreviewProps {
  searchContext: string;
  onRemove: () => void;
}

export interface SearchResponse {
  success: boolean;
  context?: string;
  error?: string;
  query?: string;
  results?: SearchResult[];
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}
