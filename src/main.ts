import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/error-handler/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: 'http://localhost:3000', // frontend dev origin
      credentials: true,
    },
  });

  // Use Socket.IO adapter instead of native WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global HTTP error / response handling
  app.useGlobalFilters(new HttpExceptionFilter());
  // ClassSerializerInterceptor must run on the raw controller return value (before
  // ResponseInterceptor wraps it in { success, data }) so @Exclude() on User.password
  // is actually applied instead of silently leaking the bcrypt hash on the wire.
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  // Global validation pipe for DTOs (HTTP + WebSocket where used)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const { version } = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
  ) as { version: string };

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ConnectU API')
    .setDescription(
      'Real-time matchmaking and chat backend with a friendships system. ' +
        'Pairs users into short-lived, anonymous chats based on profile attributes (interests, hobbies, tech stack), ' +
        'lets them converse in real time over Socket.IO, and allows them to send friend requests after chatting so ' +
        'full profiles unlock only between accepted friends. REST endpoints below cover auth, matchmaking, friends, ' +
        'profile configuration, and user management; real-time chat events are delivered over Socket.IO and are ' +
        'documented separately in docs/module-explanations/websocket-events.md.',
    )
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT issued by POST /auth/login, sent as "Authorization: Bearer <token>". Validated by JwtStrategy/JwtAuthGuard on protected routes.',
      },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 4000);
  // eslint-disable-next-line no-console
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
