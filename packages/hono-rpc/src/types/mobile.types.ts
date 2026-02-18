export type MobileIntentSuggestion = {
  id: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  seed_prompt?: string;
};

export type MobileIntentSuggestionsOutput = {
  suggestions: MobileIntentSuggestion[];
};
