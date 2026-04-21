import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from '../apps/backend/src/app.module';
import { configureApp } from '../apps/backend/src/app.bootstrap';
import { AllExceptionsFilter } from '../apps/backend/src/common/filters/all-exceptions.filter';
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as express from 'express';

let app: any;
let expressApp: express.Application;

async function initializeApp() {
  if (app) {
    return { app, expressApp };
  }

  try {
    // Create Express app for Vercel
    expressApp = express();

    // Create NestJS app with Express adapter
    app = await NestFactory.create(AppModule, expressApp, {
      logger: ['error', 'warn', 'log'],
    });

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

    await configureApp(app, { enableSwagger: true });

    // Initialize the app without listening
    await app.init();

    console.log('✅ NestJS app initialized for Vercel');
    return { app, expressApp };
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { expressApp: app } = await initializeApp();

    // Handle the request through Express/NestJS
    app(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
