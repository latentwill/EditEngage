/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      supabase: import('@supabase/supabase-js').SupabaseClient;
      user: import('@supabase/supabase-js').User | null;
      safeGetSession: () => Promise<{ session: import('@supabase/supabase-js').Session | null; user: import('@supabase/supabase-js').User | null }>;
    }
    interface PageData {
      session: import('@supabase/supabase-js').Session | null;
    }
  }
}

export {};
