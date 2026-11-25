import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BlockCategory, GoalCategory, Priority } from '@/lib/categories';
import { nowIso, todayKey } from '@/lib/date';

/**
 * Local-first data store.
 * Everything is written to the device instantly (AsyncStorage) and marked "dirty";
 * the sync engine (sync.ts) pushes dirty rows to Supabase and pulls remote changes.
 * Deletes are soft (tombstones) so they propagate to other devices.
 */

export type TableName = 'goals' | 'tasks' | 'blocks' | 'notes' | 'habits';
export const TABLES: TableName[] = ['goals', 'tasks', 'blocks', 'notes', 'habits'];

interface Base {
  id: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task extends Base {
  title: string;
  notes: string;
  emoji: string;
  subtasks: Subtask[];
  priority: Priority;
  due_date: string | null;
  goal_id: string | null;
  done: boolean;
  done_at: string | null;
  sort_order: number;
}

export interface Goal extends Base {
  title: string;
  why: string;
  category: GoalCategory;
  target_date: string | null;
  status: 'active' | 'achieved' | 'archived';
  achieved_at: string | null;
  sort_order: number;
}

export interface Block extends Base {
  date: string;
  start_min: number;
  end_min: number;
  title: string;
  category: BlockCategory;
  note: string;
  done: boolean;
  done_at: string | null;
}

export interface Note extends Base {
  title: string;
  body: string;
  pinned: boolean;
}

export interface Habit extends Base {
  title: string;
  emoji: string;
  /** Days (YYYY-MM-DD) the habit was done. */
  checks: string[];
  sort_order: number;
}

export interface RowMap {
  goals: Goal;
  tasks: Task;
  blocks: Block;
  notes: Note;
  habits: Habit;
}

type Fields<K extends TableName> = Omit<RowMap[K], keyof Base>;

const FIELDS: { [K in TableName]: () => Fields<K> } = {
  goals: () => ({
    title: '',
    why: '',
    category: 'mind',
    target_date: null,
    status: 'active',
    achieved_at: null,
    sort_order: 0,
  }),
  tasks: () => ({
    title: '',
    notes: '',
    emoji: '',
    subtasks: [],
    priority: 2,
    due_date: null,
    goal_id: null,
    done: false,
    done_at: null,
    sort_order: 0,
  }),
  blocks: () => ({
    date: todayKey(),
    start_min: 540,
    end_min: 600,
    title: '',
    category: 'deep',
    note: '',
    done: false,
    done_at: null,
  }),
  notes: () => ({ title: '', body: '', pinned: false }),
  habits: () => ({ title: '', emoji: '', checks: [], sort_order: 0 }),
};

type TablesState = { [K in TableName]: Record<string, RowMap[K]> };

interface DataState extends TablesState {
  /** `${table}:${id}` of rows not yet pushed to the server. */
  dirty: Record<string, true>;
  /** Pull cursors (raw server_updated_at of the newest row seen), per table. */
  cursors: Partial<Record<TableName, string>>;
  /** Supabase user id this local data belongs to. null = guest / not signed in yet. */
  ownerId: string | null;
  hydrated: boolean;

  create: <K extends TableName>(table: K, fields?: Partial<Fields<K>>) => RowMap[K];
  createMany: <K extends TableName>(table: K, list: Partial<Fields<K>>[]) => void;
  patch: <K extends TableName>(table: K, id: string, patch: Partial<Fields<K>>) => void;
  remove: (table: TableName, id: string) => void;

  mergeRemote: (table: TableName, rows: Record<string, unknown>[]) => void;
  markClean: (table: TableName, items: { id: string; updated_at: string }[]) => void;
  setCursor: (table: TableName, cursor: string) => void;
  /** Wipe local data and attach the store to another owner. */
  resetFor: (ownerId: string | null) => void;
  /** Attach guest data to a freshly signed-in account (everything gets uploaded). */
  adopt: (ownerId: string) => void;
}

const emptyTables = (): TablesState => ({ goals: {}, tasks: {}, blocks: {}, notes: {}, habits: {} });

/** Server timestamps look like 2026-11-24T14:31:55.79129+00:00 — normalise to JS ISO. */
function normTs(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return v;
  const frac = (m[3] ?? '.000').slice(0, 4).padEnd(4, '0');
  const tz = !m[4] || m[4] === '+00:00' || m[4] === '+0000' ? 'Z' : m[4];
  return `${m[1]}T${m[2]}${frac}${tz}`;
}

const TS_FIELDS = new Set(['created_at', 'updated_at', 'done_at', 'achieved_at']);

/** Keep only known columns, normalise timestamps. */
function fromRemote<K extends TableName>(table: K, row: Record<string, unknown>): RowMap[K] {
  const out: Record<string, unknown> = { id: row.id, deleted: !!row.deleted };
  const keys = [...Object.keys(FIELDS[table]()), 'created_at', 'updated_at'];
  for (const k of keys) {
    if (!(k in row)) continue;
    out[k] = TS_FIELDS.has(k) ? normTs(row[k]) : row[k];
  }
  return { ...FIELDS[table](), ...out } as unknown as RowMap[K];
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0);

export const uuid = () => Crypto.randomUUID();

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...emptyTables(),
      dirty: {},
      cursors: {},
      ownerId: null,
      hydrated: false,

      create: (table, fields) => {
        const now = nowIso();
        const row = {
          ...FIELDS[table](),
          ...fields,
          id: uuid(),
          created_at: now,
          updated_at: now,
          deleted: false,
        } as RowMap[typeof table];
        set((s) => ({
          [table]: { ...s[table], [row.id]: row },
          dirty: { ...s.dirty, [`${table}:${row.id}`]: true },
        }) as Partial<DataState>);
        return row;
      },

      createMany: (table, list) => {
        if (!list.length) return;
        const now = nowIso();
        set((s) => {
          const next = { ...s[table] } as Record<string, unknown>;
          const dirty = { ...s.dirty };
          for (const fields of list) {
            const row = {
              ...FIELDS[table](),
              ...fields,
              id: uuid(),
              created_at: now,
              updated_at: now,
              deleted: false,
            };
            next[row.id] = row;
            dirty[`${table}:${row.id}`] = true;
          }
          return { [table]: next, dirty } as Partial<DataState>;
        });
      },

      patch: (table, id, patch) => {
        const cur = get()[table][id];
        if (!cur) return;
        // Guarantee updated_at strictly increases (last-write-wins relies on it).
        const now = Math.max(Date.now(), ms(cur.updated_at) + 1);
        const row = { ...cur, ...patch, updated_at: new Date(now).toISOString() };
        set((s) => ({
          [table]: { ...s[table], [id]: row },
          dirty: { ...s.dirty, [`${table}:${id}`]: true },
        }) as Partial<DataState>);
      },

      remove: (table, id) => {
        const cur = get()[table][id];
        if (!cur) return;
        const now = Math.max(Date.now(), ms(cur.updated_at) + 1);
        set((s) => ({
          [table]: {
            ...s[table],
            [id]: { ...cur, deleted: true, updated_at: new Date(now).toISOString() },
          },
          dirty: { ...s.dirty, [`${table}:${id}`]: true },
        }) as Partial<DataState>);
      },

      mergeRemote: (table, rows) => {
        if (!rows.length) return;
        set((s) => {
          const next = { ...s[table] } as Record<string, RowMap[TableName]>;
          const dirty = { ...s.dirty };
          for (const raw of rows) {
            const remote = fromRemote(table, raw);
            const key = `${table}:${remote.id}`;
            const local = next[remote.id];
            if (local && dirty[key] && ms(local.updated_at) > ms(remote.updated_at)) continue;
            next[remote.id] = remote;
            delete dirty[key];
          }
          return { [table]: next, dirty } as Partial<DataState>;
        });
      },

      markClean: (table, items) => {
        set((s) => {
          const dirty = { ...s.dirty };
          for (const { id, updated_at } of items) {
            if (s[table][id]?.updated_at === updated_at) delete dirty[`${table}:${id}`];
          }
          return { dirty };
        });
      },

      setCursor: (table, cursor) => set((s) => ({ cursors: { ...s.cursors, [table]: cursor } })),

      resetFor: (ownerId) => set({ ...emptyTables(), dirty: {}, cursors: {}, ownerId }),

      adopt: (ownerId) =>
        set((s) => {
          const dirty: Record<string, true> = {};
          for (const t of TABLES) for (const id of Object.keys(s[t])) dirty[`${t}:${id}`] = true;
          return { ownerId, dirty, cursors: {} };
        }),
    }),
    {
      name: 'gz-data',
      version: 2,
      // v2: tasks gained `emoji` and `subtasks`; habits table added.
      migrate: (persisted) => {
        const st = (persisted ?? {}) as Partial<TablesState>;
        const tasks: Record<string, Task> = {};
        for (const [id, t] of Object.entries(st.tasks ?? {})) tasks[id] = { ...FIELDS.tasks(), ...t };
        return { ...st, tasks, habits: st.habits ?? {} } as DataState;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        goals: s.goals,
        tasks: s.tasks,
        blocks: s.blocks,
        notes: s.notes,
        habits: s.habits,
        dirty: s.dirty,
        cursors: s.cursors,
        ownerId: s.ownerId,
      }),
      onRehydrateStorage: () => () => {
        useData.setState({ hydrated: true });
      },
    },
  ),
);
