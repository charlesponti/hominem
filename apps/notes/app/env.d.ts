/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_TWITTER_INTEGRATION?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_PUBLIC_API_URL: string
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
