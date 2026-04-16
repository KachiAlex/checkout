const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { ExpressAdapter } = require('@nestjs/platform-express');

const serverless = require('serverless-http');

let cachedApp;

async function bootstrap() {
  if (!cachedApp) {
    const express = require('express');
    const app = await NestFactory.create(AppModule, new ExpressAdapter(express));
    app.enableCors();
    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

module.exports.handler = async (event, context) => {
  const app = await bootstrap();
  const server = serverless(app.getHttpServer());
  return server(event, context);
};
