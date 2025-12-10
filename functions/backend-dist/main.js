"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const app_bootstrap_1 = require("./app.bootstrap");
async function bootstrap() {
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const { configService } = await (0, app_bootstrap_1.configureApp)(app, { enableSwagger: true });
        const portEnv = process.env.PORT || configService.get('PORT', '10000');
        const port = parseInt(portEnv, 10) || 10000;
        console.log('✅ CORS middleware configured');
        app.getHttpAdapter().get('/', (req, res) => {
            res.json({
                status: 'ok',
                service: 'pos-backend',
                timestamp: new Date().toISOString(),
                message: 'API is running',
            });
        });
        await app.listen(port);
        console.log(`🚀 Application is running on: http://localhost:${port}`);
        console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
        console.log(`🌐 CORS enabled for configured origins`);
        console.log(`✅ Health check available at: http://localhost:${port}/api/v1/health`);
    }
    catch (error) {
        console.error('❌ Failed to start application:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        process.exit(1);
    }
}
bootstrap().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map