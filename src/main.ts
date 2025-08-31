import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';

let app: INestApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || "https://your-frontend-domain.vercel.app"]
        : ["http://localhost:3000"],
      credentials: true,
    });
    
    await app.init();
  }
  return app;
}

// For Vercel serverless
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(async (app) => {
    const port = process.env.PORT || 3001;
    await app.listen(port);
  });
}

// Export for Vercel
export default async function handler(req: Request, res: Response) {
  const app = await bootstrap();
  const expressInstance = app.getHttpAdapter().getInstance();
  return expressInstance(req, res);
}