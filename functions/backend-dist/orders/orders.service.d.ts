import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersRepository, OrderRecord } from './orders.repository';
export declare class OrdersService {
    private readonly ordersRepository;
    private readonly inventoryService;
    constructor(ordersRepository: OrdersRepository, inventoryService: InventoryService);
    create(createOrderDto: CreateOrderDto, userId: string): Promise<OrderRecord>;
    findOne(id: string): Promise<OrderRecord>;
    findByUuid(uuid: string): Promise<OrderRecord | null>;
    private validateAndDecrementInventory;
    private generateOrderNumber;
    update(id: string, updateDto: {
        status?: string;
        notes?: string;
    }): Promise<OrderRecord>;
    findAll(locationId?: string, from?: string, to?: string, status?: string): Promise<OrderRecord[]>;
}
