import { AppState } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { currentUserId, useAuth } from './auth';
import { TABLES, useData, type TableName } from './data';
import { useSettings } from './settings';

/**
 * Sync engine: push dirty local rows (upsert), then pull rows changed on the server
 * since the last cursor. Conflicts resolve by last-write-wins on `updated_at`,
 * enforced both here and by a trigger in the database.
 */

type Status = 'idle' | 'syncing' | 'error' | 'offline';

export const useSync = create<{ status: Status; lastSyncedAt: string | null; error: string | null }>(
  () => ({ status: 'idle', lastSyncedAt: null, error: null }),
);

const PAGE = 1000;
let running = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export function scheduleSync(delay = 1200) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

export async function syncNow(): Promise<void> {
  const userId = currentUserId();
  if (!userId || useData.getState().ownerId !== userId) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  useSync.setState({ status: 'syncing', error: null });
  try {
    await push(userId);
    await pull();
    useSync.setState({ status: 'idle', lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const offline = /network|fetch|timed? ?out|offline/i.test(msg);
    useSync.setState({ status: offline ? 'offline' : 'error', error: msg });
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync(300);
    }
  }
}

async function push(userId: string) {
  const byTable: Partial<Record<TableName, string[]>> = {};
  for (const key of Object.keys(useData.getState().dirty)) {
    const [table, id] = key.split(':') as [TableName, string];
    (byTable[table] ??= []).push(id);
  }
  for (const table of TABLES) {
    const ids = byTable[table];
    if (!ids?.length) continue;
    const s = useData.getState();
    const rows = ids
      .map((id) => s[table][id])
      .filter(Boolean)
      .map((r) => ({ ...r, user_id: userId }));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      useData.getState().markClean(
        table,
        chunk.map((r) => ({ id: r.id, updated_at: r.updated_at })),
      );
    }
  }
}

async function pull() {
  for (const table of TABLES) {
    for (let page = 0; page < 100; page++) {
      const cursor = useData.getState().cursors[table];
      let q = supabase
        .from(table)
        .select('*')
        .order('server_updated_at', { ascending: true })
        .limit(PAGE);
      if (cursor) q = q.gt('server_updated_at', cursor);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      useData.getState().mergeRemote(table, data);
      useData.getState().setCursor(table, String(data[data.length - 1].server_updated_at));
      if (data.length < PAGE) break;
    }
  }
}

/** Attach local data to the signed-in account (adopt guest data or reset for a different user). */
function bindOwner() {
  const userId = currentUserId();
  const d = useData.getState();
  if (!userId || !d.hydrated) return;
  if (d.ownerId !== userId) {
    if (d.ownerId === null) d.adopt(userId);
    else d.resetFor(userId);
  }
  scheduleSync(0);
}

let started = false;

/** Call once, after the data store has hydrated and auth is ready. */
export function startSync() {
  if (started) return;
  started = true;
  useAuth.subscribe((s, prev) => {
    if (s.session?.user.id !== prev.session?.user.id) bindOwner();
  });
  useData.subscribe((s, prev) => {
    if (s.dirty !== prev.dirty && Object.keys(s.dirty).length) scheduleSync();
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') scheduleSync(150);
  });
  setInterval(() => {
    if (AppState.currentState === 'active') scheduleSync(0);
  }, 5 * 60 * 1000);
  bindOwner();
}

export async function signOut() {
  await syncNow().catch(() => {});
  await supabase.auth.signOut().catch(() => {});
  useData.getState().resetFor(null);
  useSettings.getState().set({ guest: false });
}
