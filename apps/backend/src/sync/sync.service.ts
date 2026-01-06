import { Injectable } from '@nestjs/common';
import { PushChangesDto, SyncEventDto } from './dto/push-changes.dto';
import { OrdersService } from '../orders/orders.service';
import { OrdersRepository } from '../orders/orders.repository';

@Injectable()
export class SyncService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async pushChanges(dto: PushChangesDto): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const event of dto.events) {
      try {
        // Check idempotency using event ID
        const existingOrder = await this.ordersRepository.findByUuid(event.id);

        if (existingOrder) {
          processed++; // Already processed - idempotent
          continue;
        }

        // Process event based on type
        if (event.type === 'order.created') {
          await this.processOrderEvent(event);
          processed++;
        } else {
          // Unknown event type - log but don't fail
          console.warn(`Unknown event type: ${event.type}`);
          processed++;
        }
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  async pullChanges(deviceId: string, since?: string): Promise<SyncEventDto[]> {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days

    // Get orders created since last sync
    const orders = await this.ordersRepository.list({
      deviceId,
      from: sinceDate,
    });

    return orders.map((order) => ({
      id: order.uuid,
      type: 'order.created',
      payload: order,
      server_ts: order.createdAt.getTime(),
    }));
  }

  private async processOrderEvent(event: SyncEventDto): Promise<void> {
    // For MVP: Process order creation events
    // In production, this would handle various event types with proper validation
    if (event.type === 'order.created' && event.payload.uuid) {
      // Orders are created idempotently via OrdersService.create
      // This is a placeholder for future event processing
      console.log(`Processing order event: ${event.id}`);
    }
  }
}
