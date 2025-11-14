"use strict";
// Shared types and interfaces for POS Checkout MVP
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryTransactionType = exports.OrderStatus = exports.PaymentStatus = exports.PaymentMethod = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CASHIER"] = "cashier";
    UserRole["MANAGER"] = "manager";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["QR"] = "qr";
    PaymentMethod["CASH"] = "cash";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["DRAFT"] = "draft";
    OrderStatus["PENDING"] = "pending";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["CANCELLED"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var InventoryTransactionType;
(function (InventoryTransactionType) {
    InventoryTransactionType["SALE"] = "sale";
    InventoryTransactionType["RETURN"] = "return";
    InventoryTransactionType["ADJUST"] = "adjust";
    InventoryTransactionType["RECEIVED"] = "received";
})(InventoryTransactionType || (exports.InventoryTransactionType = InventoryTransactionType = {}));
