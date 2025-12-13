import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:4200',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Parsing & validation
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('TaskFlow Pro API')
    .setDescription('Complete API documentation for TaskFlow Pro backend')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('projects', 'Project management')
    .addTag('tasks', 'Task management')
    .addTag('notifications', 'Notification system')
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
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3000}`);
  console.log(
    `Swagger documentation available at http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
