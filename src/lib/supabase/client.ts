import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const createBrowserClient = () => {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Cached admin client (server-side only)
let _adminClient: SupabaseClient | null = null;

// Helper to get admin client, creating it if necessary
const getOrCreateAdminClient = (): SupabaseClient => {
  if (_adminClient) {
    return _adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
};

// Admin client with service role (for server-side operations that bypass RLS)
// This should ONLY be used in server-side code (API routes, server components, etc.)
export const createAdminClient = (): SupabaseClient => {
  // If we're on the client side, throw immediately with a clear message
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminClient cannot be used on the client side. Use it only in API routes or server components.'
    );
  }

  return getOrCreateAdminClient();
};