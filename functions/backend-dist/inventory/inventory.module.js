"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const inventory_controller_1 = require("./inventory.controller");
const inventory_service_1 = require("./inventory.service");
const inventory_repository_1 = require("./inventory.repository");
const products_module_1 = require("../products/products.module");
const locations_repository_1 = require("../locations/locations.repository");
const categories_module_1 = require("../categories/categories.module");
const brands_module_1 = require("../brands/brands.module");
const batch_inventory_repository_1 = require("./batch-inventory.repository");
const users_module_1 = require("../users/users.module");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [products_module_1.ProductsModule, categories_module_1.CategoriesModule, brands_module_1.BrandsModule, users_module_1.UsersModule],
        controllers: [inventory_controller_1.InventoryController],
        providers: [inventory_service_1.InventoryService, inventory_repository_1.InventoryRepository, locations_repository_1.LocationsRepository, batch_inventory_repository_1.BatchInventoryRepository],
        exports: [inventory_service_1.InventoryService, inventory_repository_1.InventoryRepository, batch_inventory_repository_1.BatchInventoryRepository],
    })
], InventoryModule);
//# sourceMappingURL=inventory.module.js.map