/**
 * Offline Sync Service
 * 
 * Handles offline-first synchronization:
 * - Queues events when offline
 * - Syncs to server when online
 * - Handles conflicts and retries
 */
// UUID generator - using crypto.randomUUID() if available, fallback to simple generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import axios from 'axios';
import { db, OfflineOrder, SyncEvent } from '../db/offline-db';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors?: string[];
}

class SyncService {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private syncInterval: number | null = null;

  constructor() {
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Auto-sync every 30 seconds when online
    this.startAutoSync();
  }

  /**
   * Start automatic periodic sync
   */
  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Queue an order for sync
   */
  async queueOrder(order: Omit<OfflineOrder, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const orderUuid = order.uuid || generateUUID();
    const now = Date.now();

    // Store order locally
    const orderId = await db.orders.add({
      ...order,
      uuid: orderUuid,
      status: 'pending',
      createdAt: now,
    });

    // Create sync event
    await db.syncEvents.add({
      eventId: generateUUID(),
      type: 'order.created',
      payload: {
        uuid: orderUuid,
        locationId: order.locationId,
        items: order.items,
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        deviceId: order.deviceId,
      },
      client_ts: now,
      status: 'pending',
      retryCount: 0,
    });

    // Try to sync immediately if online
    if (this.isOnline) {
      this.sync().catch((error) => {
        console.error('Failed to sync after queueing order:', error);
      });
    }

    return orderUuid;
  }

  /**
   * Sync pending events to server
   */
  async sync(accessToken?: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, errors: ['Device is offline'] };
    }

    if (!accessToken) {
      // Try to get token from localStorage or auth store
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return { success: false, synced: 0, failed: 0, errors: ['No access token'] };
      }
      accessToken = token;
    }

    this.isSyncing = true;

    try {
      // Get pending events
      const pendingEvents = await db.syncEvents
        .where('status')
        .equals('pending')
        .toArray();

      if (pendingEvents.length === 0) {
        this.isSyncing = false;
        return { success: true, synced: 0, failed: 0 };
      }

      // Get device ID
      const deviceId = localStorage.getItem('deviceId') || 'unknown';

      // Prepare events for sync
      const events = pendingEvents.map((event) => ({
        id: event.eventId,
        type: event.type,
        payload: event.payload,
        client_ts: event.client_ts,
      }));

      // Sync to server
      const response = await axios.post(
        `${API_URL}/api/v1/sync/push-changes`,
        {
          deviceId,
          events,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const { processed, failed } = response.data;

      // Update sync status for processed events
      const syncedEventIds = new Set<string>();
      for (let i = 0; i < Math.min(processed, events.length); i++) {
        const event = pendingEvents[i];
        await db.syncEvents.update(event.id!, {
          status: 'synced',
          syncedAt: Date.now(),
        });
        syncedEventIds.add(event.eventId);
      }

      // Update order status for synced orders
      const syncedOrders = await db.orders
        .where('status')
        .equals('pending')
        .toArray();

      for (const order of syncedOrders) {
        // Check if this order's event was synced
        const event = pendingEvents.find(
          (e) => e.payload.uuid === order.uuid && syncedEventIds.has(e.eventId),
        );
        if (event) {
          await db.orders.update(order.id!, {
            status: 'synced',
            syncedAt: Date.now(),
          });
        }
      }

      // Mark failed events
      if (failed > 0) {
        const failedEvents = pendingEvents.slice(processed);
        for (const event of failedEvents) {
          await db.syncEvents.update(event.id!, {
            status: 'failed',
            retryCount: event.retryCount + 1,
            error: 'Server rejected event',
          });
        }
      }

      // Update last sync time
      await db.syncState.update(1, {
        lastSyncAt: Date.now(),
      });

      this.isSyncing = false;

      if (processed > 0) {
        toast.success(`Synced ${processed} event${processed > 1 ? 's' : ''}`);
      }

      return {
        success: failed === 0,
        synced: processed,
        failed,
      };
    } catch (error: any) {
      this.isSyncing = false;

      const errorMessage = error.response?.data?.message || error.message || 'Sync failed';

      // Mark events as failed
      const pendingEvents = await db.syncEvents
        .where('status')
        .equals('pending')
        .toArray();

      for (const event of pendingEvents) {
        await db.syncEvents.update(event.id!, {
          status: 'failed',
          retryCount: event.retryCount + 1,
          error: errorMessage,
        });
      }

      console.error('Sync failed:', error);
      return {
        success: false,
        synced: 0,
        failed: pendingEvents.length,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    return db.syncEvents.where('status').equals('pending').count();
  }

  /**
   * Get failed sync count
   */
  async getFailedCount(): Promise<number> {
    return db.syncEvents.where('status').equals('failed').count();
  }

  /**
   * Retry failed syncs
   */
  async retryFailed(accessToken?: string): Promise<SyncResult> {
    // Reset failed events to pending
    const failedEvents = await db.syncEvents.where('status').equals('failed').toArray();

    for (const event of failedEvents) {
      // Only retry if retry count is less than 5
      if (event.retryCount < 5) {
        await db.syncEvents.update(event.id!, {
          status: 'pending',
          error: undefined,
        });
      }
    }

    return this.sync(accessToken);
  }

  /**
   * Get offline orders
   */
  async getOfflineOrders(): Promise<OfflineOrder[]> {
    return db.orders.orderBy('createdAt').reverse().toArray();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
    lastSyncAt?: number;
  }> {
    const state = await db.syncState.get(1);
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: await this.getPendingCount(),
      failedCount: await this.getFailedCount(),
      lastSyncAt: state?.lastSyncAt,
    };
  }
}

export const syncService = new SyncService();

