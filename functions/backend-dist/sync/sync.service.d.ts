import { PushChangesDto } from './dto/push-changes.dto';
import { OrdersService } from '../orders/orders.service';
import { OrdersRepository } from '../orders/orders.repository';
export declare class SyncService {
    private readonly ordersService;
    private readonly ordersRepository;
    constructor(ordersService: OrdersService, ordersRepository: OrdersRepository);
    pushChanges(dto: PushChangesDto): Promise<{
        processed: number;
        failed: number;
    }>;
    pullChanges(deviceId: string, since?: string): Promise<any[]>;
    private processOrderEvent;
}
