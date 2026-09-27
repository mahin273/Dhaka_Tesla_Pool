import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const corsOrigin = corsEnv.includes(',')
    ? corsEnv.split(',').map((o) => o.trim())
    : corsEnv;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Dhaka Tesla Pool API is running on port ${port}`);
}

bootstrap();
