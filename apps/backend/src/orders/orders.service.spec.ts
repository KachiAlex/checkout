import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository, OrderRecord } from './orders.repository';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { LocationsRepository } from '../locations/locations.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@pos-checkout/shared';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<OrdersRepository>;
  let inventoryService: jest.Mocked<InventoryService>;
  let customersService: jest.Mocked<CustomersService>;
  let locationsRepository: jest.Mocked<LocationsRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';
  const locationId = 'location-123';
  const customerId = 'customer-123';

  const mockCreateOrderDto: CreateOrderDto = {
    uuid: 'order-uuid-123',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        priceCents: 1000,
        taxCents: 75,
        discountCents: 0,
      },
      {
        productId: 'product-2',
        quantity: 1,
        priceCents: 2000,
        taxCents: 150,
        discountCents: 100,
      },
    ],
    subtotalCents: 3000,
    taxCents: 225,
    discountCents: 100,
    totalCents: 3125,
    customerId,
  };

  const mockOrder: OrderRecord = {
    id: 'order-123',
    uuid: 'order-uuid-123',
    locationId,
    orderNumber: 'ORD-LOCA-20240101-000001',
    status: OrderStatus.COMPLETED,
    items: mockCreateOrderDto.items,
    subtotalCents: 3000,
    taxCents: 225,
    discountCents: 100,
    totalCents: 3125,
    customerId,
    createdBy: userId,
    synced: true,
    isHeld: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: userId,
    locationId,
    tenantId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: {
            findByUuid: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            list: jest.fn(),
            findHeldOrders: jest.fn(),
          } as Partial<jest.Mocked<OrdersRepository>>,
        },
        {
          provide: InventoryService,
          useValue: {
            getStockByProduct: jest.fn(),
            decrementForSale: jest.fn(),
          } as Partial<jest.Mocked<InventoryService>>,
        },
        {
          provide: CustomersService,
          useValue: {
            addLoyaltyPoints: jest.fn(),
          } as Partial<jest.Mocked<CustomersService>>,
        },
        {
          provide: LocationsRepository,
          useValue: {
            findByTenant: jest.fn(),
          } as Partial<jest.Mocked<LocationsRepository>>,
        },
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
          } as Partial<jest.Mocked<UsersRepository>>,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    ordersRepository = module.get(OrdersRepository) as jest.Mocked<OrdersRepository>;
    inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
    customersService = module.get(CustomersService) as jest.Mocked<CustomersService>;
    locationsRepository = module.get(LocationsRepository) as jest.Mocked<LocationsRepository>;
    usersRepository = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should return existing order if UUID already exists', async () => {
      ordersRepository.findByUuid.mockResolvedValue(mockOrder);

      const result = await service.create(mockCreateOrderDto, userId, tenantId);

      expect(result).toEqual(mockOrder);
      expect(ordersRepository.create).not.toHaveBeenCalled();
    });

    it('should create new order successfully', async () => {
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.create.mockResolvedValue(mockOrder);

      const result = await service.create(mockCreateOrderDto, userId, tenantId);

      expect(result).toEqual(mockOrder);
      expect(ordersRepository.create).toHaveBeenCalled();
      expect(inventoryService.decrementForSale).toHaveBeenCalledTimes(2);
    });

    it('should resolve locationId from user if not provided', async () => {
      const dtoWithoutLocation = { ...mockCreateOrderDto, locationId: undefined };
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.create.mockResolvedValue(mockOrder);

      await service.create(dtoWithoutLocation, userId, tenantId);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId,
        }),
      );
    });

    it('should resolve locationId from tenant locations if user has no location', async () => {
      const dtoWithoutLocation = { ...mockCreateOrderDto, locationId: undefined };
      const firstLocationId = 'first-location-123';
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue({ ...mockUser, locationId: null } as any);
      locationsRepository.findByTenant.mockResolvedValue([
        { id: firstLocationId, tenantId, name: 'First Location' } as any,
      ]);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.create.mockResolvedValue(mockOrder);

      await service.create(dtoWithoutLocation, userId, tenantId);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: firstLocationId,
        }),
      );
    });

    it('should use tenantId as locationId fallback if no locations exist', async () => {
      const dtoWithoutLocation = { ...mockCreateOrderDto, locationId: undefined };
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue({ ...mockUser, locationId: null } as any);
      locationsRepository.findByTenant.mockResolvedValue([]);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.create.mockResolvedValue(mockOrder);

      await service.create(dtoWithoutLocation, userId, tenantId, undefined);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: tenantId,
        }),
      );
    });

    it('should not decrement inventory for held orders', async () => {
      const heldOrderDto = { ...mockCreateOrderDto, isHeld: true };
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      ordersRepository.create.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
        isHeld: true,
      });

      await service.create(heldOrderDto, userId, tenantId);

      expect(inventoryService.decrementForSale).not.toHaveBeenCalled();
      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.PENDING,
          isHeld: true,
        }),
      );
    });

    it('should throw ConflictException if insufficient stock', async () => {
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(1); // Less than requested quantity

      await expect(
        service.create(mockCreateOrderDto, userId, tenantId),
      ).rejects.toThrow(ConflictException);
    });

    it('should award loyalty points for completed orders with customer', async () => {
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.create.mockResolvedValue(mockOrder);

      await service.create(mockCreateOrderDto, userId, tenantId);

      expect(customersService.addLoyaltyPoints).toHaveBeenCalledWith(
        customerId,
        tenantId,
        expect.any(Number),
        mockOrder.id,
        'Points earned from purchase',
      );
    });

    it('should not award loyalty points for held orders', async () => {
      const heldOrderDto = { ...mockCreateOrderDto, isHeld: true };
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      ordersRepository.create.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
        isHeld: true,
      });

      await service.create(heldOrderDto, userId, tenantId);

      expect(customersService.addLoyaltyPoints).not.toHaveBeenCalled();
    });

    it('should generate unique order numbers', async () => {
      ordersRepository.findByUuid.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      ordersRepository.list.mockResolvedValue([]);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.create.mockResolvedValue(mockOrder);

      await service.create(mockCreateOrderDto, userId, tenantId);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderNumber: expect.stringMatching(/^ORD-/),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return order by ID', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-123');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUuid', () => {
    it('should return order by UUID', async () => {
      ordersRepository.findByUuid.mockResolvedValue(mockOrder);

      const result = await service.findByUuid('order-uuid-123');

      expect(result).toEqual(mockOrder);
    });

    it('should return null if order not found', async () => {
      ordersRepository.findByUuid.mockResolvedValue(null);

      const result = await service.findByUuid('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update order status', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder);
      ordersRepository.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.update('order-123', { status: 'cancelled' });

      expect(ordersRepository.update).toHaveBeenCalledWith('order-123', {
        status: OrderStatus.CANCELLED,
        notes: mockOrder.notes,
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should update order notes', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder);
      ordersRepository.update.mockResolvedValue({
        ...mockOrder,
        notes: 'Updated notes',
      });

      const result = await service.update('order-123', { notes: 'Updated notes' });

      expect(ordersRepository.update).toHaveBeenCalledWith('order-123', {
        status: mockOrder.status,
        notes: 'Updated notes',
      });
      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('findAll', () => {
    it('should return orders list', async () => {
      ordersRepository.list.mockResolvedValue([mockOrder]);

      const result = await service.findAll(locationId, '2024-01-01', '2024-01-31', 'completed');

      expect(result).toEqual([mockOrder]);
      expect(ordersRepository.list).toHaveBeenCalledWith({
        locationId,
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
        status: OrderStatus.COMPLETED,
      });
    });
  });

  describe('holdOrder', () => {
    it('should hold an order', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      ordersRepository.findById.mockResolvedValue(pendingOrder);
      ordersRepository.update.mockResolvedValue({
        ...pendingOrder,
        isHeld: true,
        heldAt: new Date(),
      });

      const result = await service.holdOrder('order-123');

      expect(ordersRepository.update).toHaveBeenCalledWith('order-123', {
        isHeld: true,
        heldAt: expect.any(Date),
        status: OrderStatus.PENDING,
      });
      expect(result.isHeld).toBe(true);
    });

    it('should throw error if trying to hold completed order', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder);

      await expect(service.holdOrder('order-123')).rejects.toThrow(
        'Cannot hold a completed order',
      );
    });
  });

  describe('recallOrder', () => {
    it('should recall a held order', async () => {
      const heldOrder = { ...mockOrder, isHeld: true, status: OrderStatus.PENDING };
      ordersRepository.findById.mockResolvedValue(heldOrder);
      ordersRepository.update.mockResolvedValue({
        ...heldOrder,
        isHeld: false,
        heldAt: undefined,
      });

      const result = await service.recallOrder('order-123');

      expect(ordersRepository.update).toHaveBeenCalledWith('order-123', {
        isHeld: false,
        heldAt: undefined,
      });
      expect(result.isHeld).toBe(false);
    });

    it('should throw error if order is not held', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder);

      await expect(service.recallOrder('order-123')).rejects.toThrow('Order is not held');
    });
  });

  describe('completeHeldOrder', () => {
    it('should complete a held order and decrement inventory', async () => {
      const heldOrder = {
        ...mockOrder,
        isHeld: true,
        status: OrderStatus.PENDING,
      };
      ordersRepository.findById.mockResolvedValue(heldOrder);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.update.mockResolvedValue({
        ...heldOrder,
        isHeld: false,
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      });

      const result = await service.completeHeldOrder('order-123', tenantId);

      expect(inventoryService.decrementForSale).toHaveBeenCalled();
      expect(ordersRepository.update).toHaveBeenCalledWith('order-123', {
        isHeld: false,
        heldAt: undefined,
        status: OrderStatus.COMPLETED,
        completedAt: expect.any(Date),
      });
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should award loyalty points when completing held order with customer', async () => {
      const heldOrder = {
        ...mockOrder,
        isHeld: true,
        status: OrderStatus.PENDING,
        customerId,
      };
      ordersRepository.findById.mockResolvedValue(heldOrder);
      inventoryService.getStockByProduct.mockResolvedValue(10);
      inventoryService.decrementForSale.mockResolvedValue(undefined);
      ordersRepository.update.mockResolvedValue({
        ...heldOrder,
        isHeld: false,
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      });

      await service.completeHeldOrder('order-123', tenantId);

      expect(customersService.addLoyaltyPoints).toHaveBeenCalled();
    });

    it('should throw error if order is not held', async () => {
      ordersRepository.findById.mockResolvedValue(mockOrder);

      await expect(service.completeHeldOrder('order-123', tenantId)).rejects.toThrow(
        'Order is not held',
      );
    });

    it('should throw ConflictException if insufficient stock when completing', async () => {
      const heldOrder = {
        ...mockOrder,
        isHeld: true,
        status: OrderStatus.PENDING,
      };
      ordersRepository.findById.mockResolvedValue(heldOrder);
      inventoryService.getStockByProduct.mockResolvedValue(1); // Insufficient

      await expect(service.completeHeldOrder('order-123', tenantId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});

