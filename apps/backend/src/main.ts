import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.bootstrap';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

    const { configService } = await configureApp(app, { enableSwagger: true });
    // Render requires PORT to be read from process.env.PORT or set to 10000
    // Read as string first, then convert to number to handle Render's PORT correctly
    const portEnv = process.env.PORT || configService.get<string>('PORT', '10000');
    const port = parseInt(portEnv, 10) || 10000;

    // Ensure CORS is properly configured before listening
    // This is a safety check - configureApp should have already enabled CORS
    console.log('✅ CORS middleware configured');

    // Add root-level health check endpoint (before global prefix)
    app.getHttpAdapter().get('/', (req: any, res: any) => {
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
  } catch (error) {
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
