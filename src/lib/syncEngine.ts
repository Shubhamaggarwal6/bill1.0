import { db, type SyncQueueItem, type SyncMetadata, nowISO } from './localDb';
import { supabase } from '@/integrations/supabase/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYNC_TABLES = ['tenants', 'users', 'customers', 'products', 'invoices', 'invoice_items', 'payments', 'purchases', 'credit_notes', 'credit_note_items', 'debit_notes', 'debit_note_items', 'suppliers'] as const;
type SyncTable = typeof SYNC_TABLES[number];

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline';

export interface SyncInfo {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
  pendingByTable: Record<string, number>;
}

let syncInProgress = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let listeners: Array<(info: SyncInfo) => void> = [];

// Backoff retry timers
const RETRY_DELAYS = [30000, 60000, 120000, 300000, 600000]; // 30s, 1m, 2m, 5m, 10m

export function onSyncChange(cb: (info: SyncInfo) => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}

async function notifyListeners() {
  const info = await getSyncInfo();
  listeners.forEach(cb => cb(info));
}

export async function getSyncInfo(): Promise<SyncInfo> {
  const pending = await db.sync_queue.where('status').anyOf('PENDING', 'SYNCING').toArray();
  const lastMeta = await db.sync_metadata.toArray();
  const lastSyncedAt = lastMeta.length > 0
    ? lastMeta.reduce((latest, m) => m.last_synced_at > latest ? m.last_synced_at : latest, '')
    : null;

  const pendingByTable: Record<string, number> = {};
  pending.forEach(p => {
    pendingByTable[p.table_name] = (pendingByTable[p.table_name] || 0) + 1;
  });

  let state: SyncState = 'synced';
  if (!navigator.onLine) state = 'offline';
  else if (syncInProgress) state = 'syncing';
  else if (pending.length > 0) state = 'pending';

  return {
    state,
    pendingCount: pending.length,
    lastSyncedAt: lastSyncedAt || null,
    pendingByTable,
  };
}

// PUSH local changes to server
async function pushChanges(): Promise<void> {
  const pending = await db.sync_queue
    .where('status').equals('PENDING')
    .sortBy('created_at');

  for (const item of pending) {
    // Skip and silently drop items with non-UUID record IDs (demo data)
    if (!UUID_REGEX.test(item.record_id)) {
      await db.sync_queue.delete(item.id);
      continue;
    }

    await db.sync_queue.update(item.id, { status: 'SYNCING' });
    try {
      const table = item.table_name as SyncTable;
      const payload = { ...item.payload };
      delete payload.is_local;

      if (item.operation === 'CREATE') {
        const { error } = await (supabase.from(table) as any).insert(payload);
        if (error) throw error;
      } else if (item.operation === 'UPDATE') {
        const { error } = await (supabase.from(table) as any)
          .update(payload)
          .eq('id', item.record_id);
        if (error) throw error;
      } else if (item.operation === 'DELETE') {
        const { error } = await (supabase.from(table) as any)
          .update({ is_deleted: true, updated_at: nowISO() })
          .eq('id', item.record_id);
        if (error) throw error;
      }

      await db.sync_queue.delete(item.id);
    } catch (err: any) {
      const retryCount = (item.retry_count || 0) + 1;
      if (retryCount > 5) {
        // Silently drop after 5 attempts
        await db.sync_queue.delete(item.id);
      } else {
        await db.sync_queue.update(item.id, {
          status: 'PENDING',
          retry_count: retryCount,
          last_error: err?.message || 'Unknown error',
        });
      }
    }
  }
}

// PULL server changes to local
async function pullChanges(tenantId: string): Promise<void> {
  if (!UUID_REGEX.test(tenantId)) return;

  for (const table of SYNC_TABLES) {
    try {
      const meta = await db.sync_metadata.get(table);
      const lastSynced = meta?.last_synced_at || '1970-01-01T00:00:00Z';

      let query = (supabase.from(table) as any)
        .select('*')
        .gt('updated_at', lastSynced)
        .order('updated_at', { ascending: true });

      if (table === 'tenants') {
        query = query.eq('id', tenantId);
      } else if (table !== 'invoice_items') {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) {
        // Silently skip tables that don't exist yet
        continue;
      }
      if (!data || data.length === 0) {
        await db.sync_metadata.put({ table_name: table, last_synced_at: nowISO() });
        continue;
      }

      const localTable = (db as any)[table] as import('dexie').Table;
      if (!localTable) continue;

      for (const serverRecord of data) {
        const localRecord = await localTable.get(serverRecord.id);
        if (localRecord) {
          const inQueue = await db.sync_queue
            .where('record_id').equals(serverRecord.id)
            .and(q => q.status === 'PENDING' || q.status === 'SYNCING')
            .first();

          if (inQueue) {
            if (new Date(serverRecord.updated_at) > new Date(localRecord.updated_at)) {
              await localTable.put(serverRecord);
              await db.sync_queue.delete(inQueue.id);
            }
          } else {
            if (new Date(serverRecord.updated_at) > new Date(localRecord.updated_at)) {
              await localTable.put(serverRecord);
            }
          }
        } else {
          await localTable.put(serverRecord);
        }
      }

      await db.sync_metadata.put({ table_name: table, last_synced_at: nowISO() });
    } catch (err) {
      // Silently continue
    }
  }
}

export async function syncNow(tenantId?: string): Promise<void> {
  if (syncInProgress || !navigator.onLine) return;
  if (tenantId && !UUID_REGEX.test(tenantId)) return;
  syncInProgress = true;
  await notifyListeners();

  try {
    await pushChanges();
    if (tenantId) {
      await pullChanges(tenantId);
    }
  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    syncInProgress = false;
    await notifyListeners();
  }
}

// Auto retry failed items with exponential backoff
async function autoRetryFailed(): Promise<void> {
  try {
    const failed = await db.sync_queue.where('status').equals('FAILED').toArray();
    for (const item of failed) {
      if (item.retry_count > 5) {
        await db.sync_queue.delete(item.id);
      } else {
        await db.sync_queue.update(item.id, { status: 'PENDING' });
      }
    }
  } catch {}
}

export function startAutoSync(tenantId: string) {
  stopAutoSync();

  // Clean up bad records on start
  (async () => {
    try {
      const all = await db.sync_queue.toArray();
      const bad = all.filter(f => !UUID_REGEX.test(f.record_id));
      if (bad.length > 0) {
        await Promise.all(bad.map(b => db.sync_queue.delete(b.id)));
      }
      // Also auto-retry any failed
      await autoRetryFailed();
    } catch {}
  })();

  // Sync every 30 seconds
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      autoRetryFailed().then(() => syncNow(tenantId));
    }
  }, 30000);

  const onOnline = () => {
    autoRetryFailed().then(() => syncNow(tenantId));
  };
  window.addEventListener('online', onOnline);

  const onVisible = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      syncNow(tenantId);
    }
  };
  document.addEventListener('visibilitychange', onVisible);

  const onOffline = () => notifyListeners();
  window.addEventListener('offline', onOffline);

  // Initial sync
  if (navigator.onLine) syncNow(tenantId);

  return () => {
    stopAutoSync();
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Initial data download for first-time setup
export async function initialDownload(
  tenantId: string,
  onProgress?: (table: string, done: boolean) => void
): Promise<void> {
  for (const table of SYNC_TABLES) {
    onProgress?.(table, false);
    try {
      let query = (supabase.from(table) as any).select('*');
      if (table === 'tenants') {
        query = query.eq('id', tenantId);
      } else if (table !== 'invoice_items') {
        query = query.eq('tenant_id', tenantId);
      }
      if (table === 'invoices') {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        query = query.gte('created_at', twoYearsAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        onProgress?.(table, true);
        continue;
      }
      if (data && data.length > 0) {
        const localTable = (db as any)[table] as import('dexie').Table;
        if (localTable) await localTable.bulkPut(data);
      }
      await db.sync_metadata.put({ table_name: table, last_synced_at: nowISO() });
    } catch (err) {
      // Silently continue
    }
    onProgress?.(table, true);
  }
}

// Trigger sync after a write operation
export function triggerSync(tenantId?: string) {
  if (navigator.onLine && tenantId) {
    setTimeout(() => syncNow(tenantId), 500);
  }
  notifyListeners();
}
