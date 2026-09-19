/**
 * Offline field drafts and the sync queue.
 *
 * Field officers frequently work in poor connectivity. Draft verification
 * records are persisted locally (IndexedDB, falling back to localStorage) and
 * uploaded once the officer taps "Sync now".
 *
 * This is a prototype queue: the server is the system of record, and records
 * only leave this device when the officer explicitly syncs them.
 */

export type SyncState = "pending" | "syncing" | "synced" | "failed";

export interface OfflineRecord {
  id: string;
  inspectionId: string;
  applicationNumber: string;
  instrumentCode: string;
  instrumentType: string;
  locationLabel: string;
  result: string;
  payload: {
    result: string;
    officerRemarks?: string;
    signatureName: string;
    measurements: unknown[];
    observations: Record<string, string | undefined>;
    gps?: unknown;
    photos?: unknown;
  };
  state: SyncState;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "metriq-field";
const STORE = "queue";
const LS_KEY = "metriq.queue";

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

function readLocal(): OfflineRecord[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as OfflineRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: OfflineRecord[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, 40)));
  } catch {
    /* quota exceeded — the queue simply keeps the newest records */
  }
}

export async function listQueue(): Promise<OfflineRecord[]> {
  if (!hasIndexedDb()) return readLocal();
  try {
    const db = await openDb();
    return await new Promise<OfflineRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return readLocal();
  }
}

export async function putRecord(record: OfflineRecord): Promise<void> {
  if (!hasIndexedDb()) {
    const rows = readLocal().filter((r) => r.id !== record.id);
    rows.push(record);
    writeLocal(rows);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const rows = readLocal().filter((r) => r.id !== record.id);
    rows.push(record);
    writeLocal(rows);
  }
}

export async function patchRecord(id: string, patch: Partial<OfflineRecord>) {
  const rows = await listQueue();
  const existing = rows.find((r) => r.id === id);
  if (!existing) return;
  await putRecord({ ...existing, ...patch, updatedAt: Date.now() });
}

export async function removeRecord(id: string) {
  const rows = await listQueue();
  writeLocal(rows.filter((r) => r.id !== id));
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* the localStorage mirror is already updated */
  }
}

export async function draftForInspection(inspectionId: string) {
  const rows = await listQueue();
  return rows.find((r) => r.inspectionId === inspectionId) ?? null;
}

export function newRecordId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Live connectivity hint. `navigator.onLine` is a best-effort signal. */
export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
