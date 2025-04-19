/// <reference types="vite/client" />

// This adds the missing types for React Router v7
/// <reference path="./@types/react-router.d.ts" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_GOOGLE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
