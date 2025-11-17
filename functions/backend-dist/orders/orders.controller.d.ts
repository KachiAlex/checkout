import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(createOrderDto: CreateOrderDto, req: any): Promise<import("./orders.repository").OrderRecord>;
    findOne(id: string): Promise<import("./orders.repository").OrderRecord>;
    update(id: string, updateDto: {
        status?: string;
        notes?: string;
    }): Promise<import("./orders.repository").OrderRecord>;
    findAll(locationId?: string, from?: string, to?: string, status?: string): Promise<import("./orders.repository").OrderRecord[]>;
    findHeldOrders(locationId?: string): Promise<import("./orders.repository").OrderRecord[]>;
    holdOrder(id: string): Promise<import("./orders.repository").OrderRecord>;
    recallOrder(id: string): Promise<import("./orders.repository").OrderRecord>;
    completeHeldOrder(id: string, req: any): Promise<import("./orders.repository").OrderRecord>;
}
