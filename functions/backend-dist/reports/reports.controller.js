"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async getSales(from, to, locationId) {
        return this.reportsService.getSales(from, to, locationId);
    }
    async getTopSellers(from, to, locationId, limit) {
        return this.reportsService.getTopSellers(from, to, locationId, limit);
    }
    async getSalesAnalytics(period = 'daily', locationId) {
        return this.reportsService.getSalesAnalytics(period, locationId);
    }
    async getInventoryAnalytics(period = 'daily', locationId) {
        return this.reportsService.getInventoryAnalytics(period, locationId);
    }
    async getStaffPerformance(locationId, from, to) {
        return this.reportsService.getStaffPerformance(locationId, from, to);
    }
    async getAlerts(locationId, req) {
        return this.reportsService.getAlerts(locationId, req?.user?.tenantId);
    }
    async getFraudDetection(locationId, from, to) {
        return this.reportsService.getFraudDetection(locationId, from, to);
    }
    async getExpiryAnalytics(locationId, req) {
        return this.reportsService.getExpiryAnalytics(locationId, req?.user?.tenantId);
    }
    async getShrinkageDetection(locationId, from, to) {
        return this.reportsService.getShrinkageDetection(locationId, from, to);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('sales'),
    (0, swagger_1.ApiOperation)({ summary: 'Get sales report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sales data' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('location_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getSales", null);
__decorate([
    (0, common_1.Get)('top-sellers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top selling products' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Top sellers data' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('location_id')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getTopSellers", null);
__decorate([
    (0, common_1.Get)('sales-analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get sales analytics by period (daily/weekly/monthly)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sales analytics data' }),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('location_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getSalesAnalytics", null);
__decorate([
    (0, common_1.Get)('inventory-analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory analytics by period (daily/weekly/monthly)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Inventory analytics data' }),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('location_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getInventoryAnalytics", null);
__decorate([
    (0, common_1.Get)('staff-performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get staff performance analytics (sales and inventory)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Staff performance data' }),
    __param(0, (0, common_1.Query)('location_id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getStaffPerformance", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get smart alerts (stock-outs, low sales, customer inactivity, staff performance)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Alerts data' }),
    __param(0, (0, common_1.Query)('location_id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Get)('fraud-detection'),
    (0, swagger_1.ApiOperation)({ summary: 'Get fraud detection alerts (discount abuse, suspicious patterns)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Fraud detection data' }),
    __param(0, (0, common_1.Query)('location_id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getFraudDetection", null);
__decorate([
    (0, common_1.Get)('expiry-analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get expiry and batch analytics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Expiry analytics data' }),
    __param(0, (0, common_1.Query)('location_id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getExpiryAnalytics", null);
__decorate([
    (0, common_1.Get)('shrinkage-detection'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory shrinkage detection (theoretical vs actual stock)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Shrinkage detection data' }),
    __param(0, (0, common_1.Query)('location_id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getShrinkageDetection", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map