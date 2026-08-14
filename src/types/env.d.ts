declare namespace NodeJS {
  interface ProcessEnv {
    CI?: string;
    DATABASE_URL?: string;
    E2E_TEST_EMAIL?: string;
    E2E_TEST_PASSWORD?: string;
    DIRECT_URL?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  }
}
