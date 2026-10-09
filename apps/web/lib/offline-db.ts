/**
 * Almacenamiento local persistente (IndexedDB) y Cola de Sincronización Offline (Outbox)
 * Permite que el Backoffice funcione sin conexión a internet y sincronice automáticamente
 * al recuperar la red.
 */

export interface OutboxAction {
  id: string;
  timestamp: number;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: string;
  headers?: Record<string, string>;
  description: string;
}

export interface SyncStatus {
  online: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error?: string | null;
}

const DB_NAME = 'lacajita_backoffice_offline';
const DB_VERSION = 1;
const STORE_CACHE = 'cache';
const STORE_OUTBOX = 'outbox';

const isBrowser = typeof window !== 'undefined' && 'indexedDB' in window;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!isBrowser) return Promise.reject(new Error('IndexedDB solo disponible en navegador'));
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

// -----------------------------------------------------------------------------
// 1. Caché Persistente en IndexedDB
// -----------------------------------------------------------------------------

export async function savePersistentCache(key: string, data: unknown): Promise<void> {
  if (!isBrowser) return;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    store.put({ key, data, timestamp: Date.now() });
  } catch (err) {
    console.warn('[OfflineDB] Error guardando en caché persistente:', err);
  }
}

export async function getPersistentCache<T = unknown>(key: string): Promise<T | null> {
  if (!isBrowser) return null;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data !== undefined) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearPersistentCache(pattern?: string | RegExp): Promise<void> {
  if (!isBrowser) return;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);

    if (!pattern) {
      store.clear();
      return;
    }

    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const key = String(cursor.key);
        const match = typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);
        if (match) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('[OfflineDB] Error limpiando caché persistente:', err);
  }
}

// -----------------------------------------------------------------------------
// 2. Cola de Acciones Offline (Outbox)
// -----------------------------------------------------------------------------

export async function enqueueOutbox(action: Omit<OutboxAction, 'id' | 'timestamp'>): Promise<OutboxAction> {
  const fullAction: OutboxAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
  };

  if (!isBrowser) return fullAction;

  try {
    const db = await getDb();
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    tx.objectStore(STORE_OUTBOX).add(fullAction);
    notifyStatusChange();
  } catch (err) {
    console.warn('[OfflineDB] Error encolando acción offline:', err);
  }

  return fullAction;
}

export async function getOutboxList(): Promise<OutboxAction[]> {
  if (!isBrowser) return [];
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const store = tx.objectStore(STORE_OUTBOX);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as OutboxAction[]);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeOutboxItem(id: string): Promise<void> {
  if (!isBrowser) return;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    tx.objectStore(STORE_OUTBOX).delete(id);
    notifyStatusChange();
  } catch (err) {
    console.warn('[OfflineDB] Error eliminando acción de outbox:', err);
  }
}

// -----------------------------------------------------------------------------
// 3. Procesador de Sincronización Automática
// -----------------------------------------------------------------------------

let isSyncing = false;
const listeners = new Set<(status: SyncStatus) => void>();

export function subscribeSyncStatus(fn: (status: SyncStatus) => void): () => void {
  listeners.add(fn);
  emitCurrentStatus(fn);
  return () => listeners.delete(fn);
}

async function emitCurrentStatus(fn?: (status: SyncStatus) => void) {
  const pending = await getOutboxList();
  const status: SyncStatus = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: pending.length,
    isSyncing,
    lastSyncedAt: Number(sessionStorage?.getItem('lacajita_last_synced') || 0) || null,
  };
  if (fn) {
    fn(status);
  } else {
    listeners.forEach((l) => l(status));
  }
}

function notifyStatusChange() {
  emitCurrentStatus();
}

/** Ejecuta todas las acciones en cola contra la API central. */
export async function syncPendingActions(): Promise<{ processed: number; errors: number }> {
  if (!isBrowser || isSyncing) return { processed: 0, errors: 0 };
  if (!navigator.onLine) {
    notifyStatusChange();
    return { processed: 0, errors: 0 };
  }

  const actions = await getOutboxList();
  if (actions.length === 0) return { processed: 0, errors: 0 };

  isSyncing = true;
  notifyStatusChange();

  let processed = 0;
  let errors = 0;

  // Ordenar cronológicamente (FIFO)
  actions.sort((a, b) => a.timestamp - b.timestamp);

  for (const act of actions) {
    try {
      const res = await fetch(act.url, {
        method: act.method,
        headers: {
          'content-type': 'application/json',
          ...(act.headers || {}),
        },
        body: act.body,
      });

      if (res.ok || res.status === 204) {
        await removeOutboxItem(act.id);
        processed++;
      } else if (res.status >= 400 && res.status < 500) {
        // Error de cliente / validación: descartar para no bloquear la cola
        console.warn(`[Sync] Acción ${act.id} descartada por error ${res.status}:`, act.description);
        await removeOutboxItem(act.id);
        errors++;
      } else {
        // Error 500 o del servidor: mantener en cola para reintentar
        errors++;
        break;
      }
    } catch {
      // Pérdida de conexión durante el envío
      errors++;
      break;
    }
  }

  isSyncing = false;
  try {
    sessionStorage.setItem('lacajita_last_synced', String(Date.now()));
  } catch {
    // no-op
  }
  notifyStatusChange();

  return { processed, errors };
}

// Escuchar automáticamente cuando vuelva la red
if (isBrowser) {
  window.addEventListener('online', () => {
    notifyStatusChange();
    syncPendingActions();
  });

  window.addEventListener('offline', () => {
    notifyStatusChange();
  });

  // Reintento periódico cada 30s si hay cosas pendientes y estamos online
  setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      syncPendingActions();
    }
  }, 30_000);
}
