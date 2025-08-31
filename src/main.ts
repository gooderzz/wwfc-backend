import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || "https://your-frontend-domain.vercel.app"]
      : ["http://localhost:3000"],
    credentials: true,
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();