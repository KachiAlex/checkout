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
    'capacitor://localhost',
    'https://checkout-77d99.web.app',
    'https://checkout-77d99.firebaseapp.com',
  ];

  const corsOriginConfig = configService.get<string>(
    'CORS_ORIGIN',
    defaultCorsOrigins.join(','),
  );

  let corsOrigins: true | string[];

  if (nodeEnv === 'development') {
    corsOrigins = true;
  } else if (corsOriginConfig.trim() === '*') {
    corsOrigins = true;
  } else {
    corsOrigins = corsOriginConfig
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
  }

  if (Array.isArray(corsOrigins) && corsOrigins.length === 0) {
    corsOrigins = defaultCorsOrigins;
  }

  const originHandler =
    corsOrigins === true
      ? true
      : (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (!requestOrigin) {
            return callback(null, true);
          }

          const normalizedOrigin = requestOrigin.trim().toLowerCase();
          const allowByPrefix =
            normalizedOrigin.startsWith('capacitor://') ||
            normalizedOrigin.startsWith('http://localhost') ||
            normalizedOrigin.startsWith('https://localhost');

          if (allowByPrefix || (corsOrigins as string[]).includes(requestOrigin)) {
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

  console.log(
    `🔧 Bootstrap - NODE_ENV: ${nodeEnv}, Prefix: /${effectiveApiPrefix}, Origin: ${
      corsOrigins === true ? 'ALL' : corsOrigins.join(',')
    }`,
  );

  app.enableCors(corsConfig);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
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

  const shouldEnableSwagger =
    typeof options?.enableSwagger === 'boolean'
      ? options.enableSwagger
      : nodeEnv !== 'production';

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

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  return {
    configService,
  };
}

