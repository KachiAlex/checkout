import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersRepository, OrderRecord } from './orders.repository';
import { CustomersService } from '../customers/customers.service';
export declare class OrdersService {
    private readonly ordersRepository;
    private readonly inventoryService;
    private readonly customersService;
    constructor(ordersRepository: OrdersRepository, inventoryService: InventoryService, customersService: CustomersService);
    create(createOrderDto: CreateOrderDto, userId: string, tenantId: string): Promise<OrderRecord>;
    findOne(id: string): Promise<OrderRecord>;
    findByUuid(uuid: string): Promise<OrderRecord | null>;
    private validateAndDecrementInventory;
    private generateOrderNumber;
    update(id: string, updateDto: {
        status?: string;
        notes?: string;
    }): Promise<OrderRecord>;
    findAll(locationId?: string, from?: string, to?: string, status?: string): Promise<OrderRecord[]>;
    findHeldOrders(locationId?: string): Promise<OrderRecord[]>;
    holdOrder(id: string): Promise<OrderRecord>;
    recallOrder(id: string): Promise<OrderRecord>;
    completeHeldOrder(id: string, tenantId: string): Promise<OrderRecord>;
    private awardLoyaltyPoints;
}
