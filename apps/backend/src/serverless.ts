import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app.bootstrap';

const logger = new Logger('ServerlessBootstrap');
let cachedServer: Express | null = null;

export const createServer = async (): Promise<Express> => {
  if (cachedServer) {
    return cachedServer;
  }

  logger.log('Initializing NestJS server for Firebase Functions');

  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      bodyParser: true,
    },
  );

  await configureApp(nestApp, { enableSwagger: false });
  await nestApp.init();

  cachedServer = expressApp;
  logger.log('NestJS server initialized for Firebase Functions');

  return cachedServer;
};

