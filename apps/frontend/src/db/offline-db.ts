/**
 * Offline Database (IndexedDB) using Dexie
 * 
 * Stores orders and sync events locally for offline-first operation
 */
import Dexie, { Table } from 'dexie';

export interface OfflineOrder {
  id?: number; // Auto-increment primary key
  uuid: string; // Client-generated UUID for idempotency
  locationId: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceCents: number;
    taxCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  deviceId?: string;
  status: 'pending' | 'synced' | 'failed';
  createdAt: number; // Unix timestamp
  syncedAt?: number; // When successfully synced
  error?: string; // Error message if sync failed
}

export interface SyncEvent {
  id?: number; // Auto-increment primary key
  eventId: string; // UUID for idempotency
  type: string; // e.g., 'order.created'
  payload: Record<string, unknown>;
  client_ts: number; // Client timestamp
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
  syncedAt?: number;
  error?: string;
}

export interface SyncState {
  id?: number; // Always 1
  lastSyncAt?: number; // Last successful sync timestamp
  deviceId?: string;
}

class OfflineDatabase extends Dexie {
  orders!: Table<OfflineOrder>;
  syncEvents!: Table<SyncEvent>;
  syncState!: Table<SyncState>;

  constructor() {
    super('POSCheckoutOfflineDB');
    
    this.version(1).stores({
      orders: '++id, uuid, status, createdAt',
      syncEvents: '++id, eventId, status, client_ts',
      syncState: 'id', // Single record with id=1
    });
  }
}

export const db = new OfflineDatabase();

// Initialize sync state if it doesn't exist
db.syncState.get(1).then((state) => {
  if (!state) {
    db.syncState.add({ id: 1 });
  }
});

