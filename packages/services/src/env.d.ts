import 'dotenv/config';
export declare const env: {
  NODE_ENV: 'development' | 'production' | 'test';
  AI_SDK_TRANSCRIBE_ENABLED: boolean;
  AI_SDK_SPEECH_ENABLED: boolean;
  AI_SDK_CHAT_WEB_ENABLED: boolean;
  AI_SDK_CHAT_MOBILE_ENABLED: boolean;
  REDIS_URL: string;
  DATABASE_URL?: string | undefined;
  DB_MAX_CONNECTIONS?: number | undefined;
  DB_IDLE_TIMEOUT?: number | undefined;
  DB_MAX_LIFETIME?: number | undefined;
  GOOGLE_API_KEY?: string | undefined;
  VITE_GOOGLE_API_KEY?: string | undefined;
  VITE_APP_BASE_URL?: string | undefined;
  APP_BASE_URL?: string | undefined;
  OPENAI_API_KEY?: string | undefined;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  GOOGLE_REDIRECT_URI?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  RESEND_FROM_EMAIL?: string | undefined;
  RESEND_FROM_NAME?: string | undefined;
};
//# sourceMappingURL=env.d.ts.map
