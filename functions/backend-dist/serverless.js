"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const express_1 = __importDefault(require("express"));
const app_module_1 = require("./app.module");
const app_bootstrap_1 = require("./app.bootstrap");
const logger = new common_1.Logger('ServerlessBootstrap');
let cachedServer = null;
const createServer = async () => {
    if (cachedServer) {
        return cachedServer;
    }
    logger.log('Initializing NestJS server for Firebase Functions');
    const expressApp = (0, express_1.default)();
    const nestApp = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp), {
        bodyParser: true,
    });
    await (0, app_bootstrap_1.configureApp)(nestApp, { enableSwagger: false });
    await nestApp.init();
    cachedServer = expressApp;
    logger.log('NestJS server initialized for Firebase Functions');
    return cachedServer;
};
exports.createServer = createServer;
//# sourceMappingURL=serverless.js.map