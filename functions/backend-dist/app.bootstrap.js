"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApp = configureApp;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const compression = require('compression');
async function configureApp(app, options) {
    const configService = app.get(config_1.ConfigService);
    const nodeEnv = configService.get('NODE_ENV', 'development');
    const rawApiPrefix = configService.get('API_PREFIX', 'api/v1');
    const normalizedApiPrefix = rawApiPrefix.replace(/^\/+/, '');
    const isRunningInCloudFunctions = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
    const functionTarget = process.env.FUNCTION_TARGET ?? process.env.K_SERVICE ?? '';
    const shouldStripApiSegment = isRunningInCloudFunctions &&
        functionTarget === 'api' &&
        normalizedApiPrefix.toLowerCase().startsWith('api/');
    const effectiveApiPrefix = shouldStripApiSegment
        ? normalizedApiPrefix.replace(/^api\//i, '')
        : normalizedApiPrefix;
    const defaultCorsOrigins = [
        'http://localhost',
        'http://localhost:5173',
        'http://localhost:5174',
        'capacitor://localhost',
        'https://checkout-77d99.web.app',
        'https://checkout-77d99.firebaseapp.com',
    ];
    const corsOriginConfig = configService.get('CORS_ORIGIN', defaultCorsOrigins.join(','));
    let corsOrigins;
    if (corsOriginConfig.trim() === '*') {
        if (nodeEnv === 'production') {
            console.warn('⚠️  CORS allows all origins in production - not recommended for security');
        }
        corsOrigins = true;
    }
    else {
        corsOrigins = corsOriginConfig
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean);
    }
    if (Array.isArray(corsOrigins) && corsOrigins.length === 0) {
        corsOrigins = defaultCorsOrigins;
    }
    const originHandler = corsOrigins === true
        ? true
        : (requestOrigin, callback) => {
            if (!requestOrigin) {
                return callback(null, true);
            }
            const normalizedOrigin = requestOrigin.trim().toLowerCase();
            const normalizedCorsOrigins = corsOrigins.map(origin => origin.trim().toLowerCase());
            const allowByPrefix = normalizedOrigin.startsWith('capacitor://') ||
                normalizedOrigin.startsWith('http://localhost') ||
                normalizedOrigin.startsWith('https://localhost');
            if (allowByPrefix || normalizedCorsOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }
            console.warn(`❌ CORS blocked origin: ${requestOrigin}`);
            callback(null, false);
        };
    const corsConfig = {
        origin: originHandler,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'X-Requested-With',
            'Origin',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers',
        ],
        exposedHeaders: ['Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
    console.log(`🔧 Bootstrap - NODE_ENV: ${nodeEnv}, Prefix: /${effectiveApiPrefix}, Origin: ${corsOrigins === true ? 'ALL' : corsOrigins.join(',')}`);
    app.enableCors(corsConfig);
    const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
    };
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: nodeEnv === 'production' ? {
            directives: cspDirectives,
        } : false,
    }));
    app.use(compression());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.setGlobalPrefix(effectiveApiPrefix);
    const shouldEnableSwagger = typeof options?.enableSwagger === 'boolean'
        ? options.enableSwagger
        : nodeEnv !== 'production';
    if (shouldEnableSwagger) {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('POS Checkout MVP API')
            .setDescription('Production-ready Point-of-Sale system API')
            .setVersion('1.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
        }, 'JWT-auth')
            .addTag('auth', 'Authentication endpoints')
            .addTag('products', 'Product management')
            .addTag('inventory', 'Inventory management')
            .addTag('orders', 'Order processing')
            .addTag('payments', 'Payment processing')
            .addTag('sync', 'Offline sync')
            .addTag('reports', 'Reporting')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
    }
    return {
        configService,
    };
}
//# sourceMappingURL=app.bootstrap.js.map