import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { config } from '@/shared/config';

let _client: SupabaseClient | null = null;

/**
 * Lazy Supabase client singleton. Returns null when EXPO_PUBLIC_SUPABASE_*
 * envs are missing — callers (SignIn screen, useSession) treat this as
 * "real auth not configured" and fall back to the dev session path.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  _client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      // AsyncStorage works on native; on web Supabase will fall back to
      // localStorage automatically when the storage option is omitted there.
      storage:        Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession:   true,
      // OAuth callbacks come back through expo-auth-session, not through the
      // hash fragment that Supabase looks for on its own.
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
  return _client;
}

export function isSupabaseAuthAvailable(): boolean {
  return !!config.supabaseUrl && !!config.supabaseAnonKey;
}
