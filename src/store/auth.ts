import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  ready: boolean;
}

export const useAuth = create<AuthState>(() => ({ session: null, ready: false }));

let started = false;

export function startAuth() {
  if (started) return;
  started = true;
  supabase.auth
    .getSession()
    .then(({ data }) => useAuth.setState({ session: data.session, ready: true }))
    .catch(() => useAuth.setState({ ready: true }));
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session, ready: true });
  });
}

export const currentUserId = () => useAuth.getState().session?.user.id ?? null;
