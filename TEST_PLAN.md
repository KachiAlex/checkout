# Comprehensive Test Plan for POS Checkout System

## Overview
This document outlines all tests to be implemented for the POS Checkout system, covering frontend, backend, and end-to-end scenarios.

---

## 1. Frontend Tests (Vitest + React Testing Library)

### 1.1 Utility Functions

#### 1.1.1 Number Formatting Utilities (`numberFormat.ts`)
- ✅ `formatNumber()`
  - Formats integers with commas (1000 → "1,000")
  - Formats decimals with commas (1234.56 → "1,234.56")
  - Handles zero and negative numbers
  - Handles NaN and invalid inputs
  - Handles large numbers (millions, billions)
  
- ✅ `formatCurrency()`
  - Formats cents to currency string (100000 → "₦1,000.00")
  - Handles zero cents
  - Handles negative amounts
  - Handles string inputs
  
- ✅ `parseFormattedNumber()`
  - Parses comma-formatted strings (1,234.56 → 1234.56)
  - Handles empty strings
  - Handles invalid inputs
  - Handles decimal numbers
  
- ✅ `formatNumberInput()`
  - Formats as user types
  - Handles decimal inputs (allowDecimals: true)
  - Handles integer inputs (allowDecimals: false)
  - Limits decimal places to 2
  - Prevents multiple decimal points
  
- ✅ `handleNumberInputChange()`
  - Returns formatted display value
  - Returns parsed numeric value
  - Handles edge cases

#### 1.1.2 UUID Utilities (`uuid.ts`)
- Generate UUIDs
- Validate UUID format

#### 1.1.3 Native Platform (`nativePlatform.ts`)
- ✅ Already tested

### 1.2 State Management (Zustand Stores)

#### 1.2.1 Auth Store (`authStore.ts`)
- Login functionality
- Logout functionality
- Token refresh
- User state management
- Tenant selection

#### 1.2.2 Cart Store (`cartStore.ts`)
- Add item to cart
- Remove item from cart
- Update quantity
- Clear cart
- Calculate totals
- Apply discounts
- Price overrides

#### 1.2.3 Theme Store (`themeStore.ts`)
- Toggle theme (light/dark)
- Persist theme preference

#### 1.2.4 Scanner Device Store (`scannerDeviceStore.ts`)
- Device registration
- Device selection
- Device list management

### 1.3 Services

#### 1.3.1 Payment Service (`paymentService.ts`)
- Process card payment
- Process cash payment
- Process QR payment
- Process transfer payment
- Handle payment errors
- Calculate change

#### 1.3.2 Sync Service (`syncService.ts`)
- Sync offline data
- Handle sync conflicts
- Queue operations
- Retry failed operations

#### 1.3.3 User Service (`userService.ts`)
- Fetch user data
- Update user profile
- Handle errors

#### 1.3.4 Receipt Service (`receiptService.ts`)
- Generate receipt
- Print receipt
- Email receipt

### 1.4 Components

#### 1.4.1 PaymentModal
- Renders payment methods
- Handles cash amount input with formatting
- Calculates change correctly
- Validates payment amount
- Processes payment
- Shows success/error states

#### 1.4.2 CartSummary
- Displays cart items with formatted prices
- Shows subtotal, tax, total with commas
- Handles discounts
- Updates quantities
- Removes items

#### 1.4.3 ProductSearch
- Searches products
- Displays products with formatted prices
- Handles stock status
- Adds to cart

#### 1.4.4 QuantitySelectorModal
- Selects quantity
- Displays formatted price
- Calculates total with formatting
- Validates max quantity

#### 1.4.5 PriceOverrideModal
- Inputs new price with formatting
- Validates manager PIN
- Calculates price difference
- Confirms override

#### 1.4.6 DiscountModal
- Applies item discount
- Applies cart discount
- Validates discount amounts
- Shows formatted discount values

#### 1.4.7 SplitPaymentModal
- Handles split payments
- Formats payment amounts
- Validates split amounts
- Tracks remaining balance

#### 1.4.8 CustomerDisplay
- Displays cart items with formatting
- Shows totals with formatting
- Displays payment method
- Shows change amount

### 1.5 Pages

#### 1.5.1 CheckoutPage
- Renders product search
- Displays cart
- Handles checkout flow
- Formats all prices with commas
- Processes orders
- Handles errors

#### 1.5.2 AddInventoryPage
- Adds new inventory items
- Formats quantity, cost, selling price inputs
- Displays inventory list with formatting
- Edits inventory items
- Updates inventory with formatted values
- Validates required fields

#### 1.5.3 InventoryPage
- Displays inventory
- Formats all numeric values
- Handles inventory updates

#### 1.5.4 LoginPage
- Renders login form
- Handles authentication
- Shows errors
- Redirects on success

#### 1.5.5 ReportsPage
- Displays sales reports
- Formats all monetary values
- Handles date ranges
- Exports data

---

## 2. Backend Tests (Jest)

### 2.1 Services

#### 2.1.1 Auth Service (`auth.service.spec.ts`)
- ✅ Already partially tested
- Login with valid PIN
- Login with invalid PIN
- Device registration
- Token generation
- Token refresh
- Manager verification

#### 2.1.2 Products Service (`products.service.spec.ts`)
- ✅ Already partially tested
- Find all products
- Find product by ID
- Search products
- Create product
- Update product
- Delete product
- Handle not found errors

#### 2.1.3 Inventory Service (`inventory.service.ts`)
- Get inventory by location
- Add inventory item
- Update inventory item (quantity, cost, selling price)
- Adjust quantity
- Create inventory transaction
- Calculate stock levels
- Handle reorder points

#### 2.1.4 Orders Service (`orders.service.ts`)
- Create order
- Get order by ID
- Get orders by date range
- Calculate totals
- Apply discounts
- Handle tax calculation
- Process returns

#### 2.1.5 Payments Service (`payments.service.ts`)
- Process payment
- Handle different payment methods
- Record payment
- Refund payment
- Handle payment errors

#### 2.1.6 Customers Service (`customers.service.ts`)
- Create customer
- Find customer by ID
- Search customers
- Update customer
- Add loyalty points
- Redeem loyalty points

#### 2.1.7 Purchase Orders Service (`purchase-orders.service.ts`)
- Create purchase order
- Get purchase order
- Update purchase order status
- Calculate totals

#### 2.1.8 GRN Service (`grn.service.ts`)
- Create GRN
- Receive items
- Update batch information
- Calculate costs

#### 2.1.9 Reports Service (`reports.service.ts`)
- Generate sales report
- Generate inventory report
- Generate profit/loss report
- Filter by date range
- Calculate totals correctly

### 2.2 Controllers

#### 2.2.1 Auth Controller
- POST /auth/login
- POST /auth/register-device
- POST /auth/verify-manager
- POST /auth/refresh

#### 2.2.2 Products Controller
- GET /products
- GET /products/:id
- POST /products
- PUT /products/:id
- DELETE /products/:id

#### 2.2.3 Inventory Controller
- GET /inventory
- POST /inventory/item
- PUT /inventory/item
- POST /inventory/adjust
- GET /inventory/transactions

#### 2.2.4 Orders Controller
- POST /orders
- GET /orders/:id
- GET /orders
- PUT /orders/:id/status

#### 2.2.5 Payments Controller
- POST /payments/initiate
- POST /payments/confirm
- GET /payments/:id

### 2.3 DTOs Validation

#### 2.3.1 Auth DTOs
- LoginDto validation
- DeviceRegisterDto validation
- VerifyManagerDto validation

#### 2.3.2 Inventory DTOs
- CreateInventoryItemDto validation
- UpdateInventoryItemDto validation
- AdjustInventoryDto validation

#### 2.3.3 Order DTOs
- CreateOrderDto validation
- OrderItemDto validation

#### 2.3.4 Payment DTOs
- InitiatePaymentDto validation

### 2.4 Repositories

#### 2.4.1 Products Repository
- Firestore queries
- Data transformation
- Error handling

#### 2.4.2 Inventory Repository
- Upsert operations
- Transaction creation
- Query by location

#### 2.4.3 Orders Repository
- Order creation
- Query by date
- Status updates

---

## 3. Integration Tests

### 3.1 Checkout Flow
- ✅ Already exists (`e2e-checkout-flow.spec.ts`)
- Add product to cart
- Apply discount
- Process payment
- Create order
- Update inventory

### 3.2 Inventory Management Flow
- Add inventory item
- Update inventory
- Create transaction
- Adjust quantity

### 3.3 Purchase Order Flow
- Create purchase order
- Receive goods (GRN)
- Update inventory
- Record batch information

---

## 4. Test Coverage Goals

### Frontend
- **Unit Tests**: 80%+ coverage
- **Component Tests**: All major components
- **Integration Tests**: Critical user flows

### Backend
- **Unit Tests**: 85%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical business flows

---

## 5. Test Implementation Priority

### Phase 1: Critical Path (High Priority)
1. ✅ Number formatting utilities (NEW - just added)
2. Cart store functionality
3. Payment processing
4. Inventory update functionality
5. Order creation

### Phase 2: Core Features (Medium Priority)
1. Product search and display
2. Customer management
3. Reports generation
4. Purchase orders
5. GRN processing

### Phase 3: Edge Cases & Polish (Lower Priority)
1. Error handling
2. Offline sync
3. Receipt generation
4. Theme management
5. Scanner device management

---

## 6. Test Execution

### Running Tests
```bash
# Frontend tests
npm run test --workspace=apps/frontend
npm run test:watch --workspace=apps/frontend
npm run test:coverage --workspace=apps/frontend

# Backend tests
npm run test --workspace=apps/backend
npm run test:watch --workspace=apps/backend
npm run test:cov --workspace=apps/backend
npm run test:e2e --workspace=apps/backend

# All tests
npm run test
```

### CI/CD Integration
- Tests run automatically on push/PR
- Coverage reports generated
- Tests must pass before deployment

---

## 7. Test Data & Fixtures

### Frontend
- Mock products
- Mock cart items
- Mock user data
- Mock API responses

### Backend
- Test tenants
- Test users
- Test products
- Test inventory
- Test orders

---

## Notes
- All monetary values should be tested with comma formatting
- All number inputs should be tested for formatting behavior
- Edge cases (empty, null, invalid) should be covered
- Error scenarios should be tested
- Integration tests should cover real user workflows

