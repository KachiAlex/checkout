import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const compression = require('compression');

export interface AppBootstrapOptions {
  enableSwagger?: boolean;
}

export async function configureApp(app: INestApplication, options?: AppBootstrapOptions) {
  const configService = app.get(ConfigService);

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const rawApiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const normalizedApiPrefix = rawApiPrefix.replace(/^\/+/, '');

  const isRunningInCloudFunctions = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
  const functionTarget = process.env.FUNCTION_TARGET ?? process.env.K_SERVICE ?? '';

  const shouldStripApiSegment =
    isRunningInCloudFunctions &&
    functionTarget === 'api' &&
    normalizedApiPrefix.toLowerCase().startsWith('api/');

  const effectiveApiPrefix = shouldStripApiSegment
    ? normalizedApiPrefix.replace(/^api\//i, '')
    : normalizedApiPrefix;

  const defaultCorsOrigins = [
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'capacitor://localhost',
    'https://checkout-77d99.web.app',
    'https://checkout-77d99.firebaseapp.com',
    'https://checkoutpos.online',
    // Add common development origins
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://localhost:5173',
  ];

  const corsOriginConfig = configService.get<string>('CORS_ORIGIN', defaultCorsOrigins.join(','));

  let corsOrigins: true | string[];

  // Always use configured origins, even in development
  // Only allow all origins if explicitly set to '*'
  if (corsOriginConfig.trim() === '*') {
    if (nodeEnv === 'production') {
      console.warn('⚠️  CORS allows all origins in production - not recommended for security');
    }
    corsOrigins = true;
  } else {
    corsOrigins = corsOriginConfig
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (Array.isArray(corsOrigins) && corsOrigins.length === 0) {
    corsOrigins = defaultCorsOrigins;
  }

  const originHandler =
    corsOrigins === true
      ? true
      : (
          requestOrigin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!requestOrigin) {
            return callback(null, true);
          }

          const normalizedOrigin = requestOrigin.trim().toLowerCase();
          const normalizedCorsOrigins = (corsOrigins as string[]).map((origin) =>
            origin.trim().toLowerCase(),
          );

          const allowByPrefix =
            normalizedOrigin.startsWith('capacitor://') ||
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
      'Cache-Control',
      'Pragma',
      'Expires',
      'X-Forwarded-For',
      'X-Real-IP',
    ],
    exposedHeaders: ['Authorization', 'Content-Length', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours preflight cache
  };

  console.log(
    `🔧 Bootstrap - NODE_ENV: ${nodeEnv}, Prefix: /${effectiveApiPrefix}, Origin: ${
      corsOrigins === true ? 'ALL' : corsOrigins.join(',')
    }`,
  );
  console.log(
    `🔧 CORS Configuration - Allowed Origins:`,
    corsOrigins === true ? 'ALL (*)' : corsOrigins,
  );
  console.log(`🔧 CORS Configuration - CORS_ORIGIN env var:`, corsOriginConfig);

  // Enable CORS BEFORE other middleware
  app.enableCors(corsConfig);

  // Add explicit OPTIONS handler middleware to ensure CORS headers are ALWAYS sent
  // This is a safety net in case NestJS CORS middleware doesn't catch all cases
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;

    // Log auth-related requests for debugging
    if (req.method === 'OPTIONS' || req.url.includes('/auth/')) {
      console.log(`[CORS] ${req.method} ${req.url} from origin: ${origin || 'none'}`);
    }

    // Check if origin is allowed
    const isAllowedOrigin =
      corsOrigins === true ||
      !origin ||
      (Array.isArray(corsOrigins) &&
        (corsOrigins.some((allowed) => origin.toLowerCase() === allowed.toLowerCase()) ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('https://localhost') ||
          origin.startsWith('capacitor://')));

    if (isAllowedOrigin && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (corsOrigins === true) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,Accept,X-Requested-With,Origin,Access-Control-Request-Method,Access-Control-Request-Headers,Cache-Control,Pragma,Expires',
    );
    res.setHeader('Access-Control-Expose-Headers', 'Authorization,Content-Length,X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight OPTIONS requests immediately
    if (req.method === 'OPTIONS') {
      console.log(
        `✅ Handling OPTIONS preflight from origin: ${origin || 'none'} - Allowed: ${isAllowedOrigin}`,
      );
      return res.status(204).end();
    }

    // Log all requests for debugging
    if (origin) {
      console.log(
        `🌐 Request from origin: ${origin} - Method: ${req.method} - Path: ${req.path} - Allowed: ${isAllowedOrigin}`,
      );
    }

    next();
  });

  // Configure Content Security Policy
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for compatibility
    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for compatibility
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:'],
    fontSrc: ["'self'", 'data:', 'https:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  };

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy:
        nodeEnv === 'production'
          ? {
              directives: cspDirectives,
            }
          : false, // Disable CSP in development for easier debugging
    }),
  );

  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix(effectiveApiPrefix);

  // Ensure CORS is applied after global prefix is set
  // NestJS CORS middleware should handle OPTIONS automatically, but we verify it's enabled
  console.log('✅ Global prefix set to:', `/${effectiveApiPrefix}`);
  console.log('✅ CORS middleware active');

  const shouldEnableSwagger =
    typeof options?.enableSwagger === 'boolean' ? options.enableSwagger : nodeEnv !== 'production';

  if (shouldEnableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('POS Checkout MVP API')
      .setDescription('Production-ready Point-of-Sale system API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('products', 'Product management')
      .addTag('inventory', 'Inventory management')
      .addTag('orders', 'Order processing')
      .addTag('payments', 'Payment processing')
      .addTag('sync', 'Offline sync')
      .addTag('reports', 'Reporting')
      .build();

    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api/docs', app as any, document);
  }

  return {
    configService,
  };
}
