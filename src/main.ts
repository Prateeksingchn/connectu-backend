import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/error-handler/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // Enable CORS (including for WebSocket upgrades)
  });

  // Use Socket.IO adapter instead of native WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global HTTP error / response handling
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global validation pipe for DTOs (HTTP + WebSocket where used)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  
  await app.listen(process.env.PORT ?? 3000);
  // eslint-disable-next-line no-console
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
