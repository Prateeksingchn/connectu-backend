import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();

      // Get token from handshake auth, headers, or query
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.split(' ')[1] ||
        (client.handshake?.query?.token as string | undefined);

      if (!token) {
        this.logger.error(`[WsJwtGuard] ❌ No token provided for ${client.id}`);
        throw new WsException('No token provided');
      }

      this.logger.debug(`[WsJwtGuard] 🔍 Verifying token for ${client.id}`);

      // Verify token using configured secret
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user data to socket for later use in handlers
      (client as any).userId = payload.sub;
      (client as any).email = payload.email;
      (client as any).role = payload.role;

      this.logger.log(
        `[WsJwtGuard] ✅ Token verified for user: ${payload.sub}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `[WsJwtGuard] ❌ JWT verification failed: ${error.message}`,
      );
      throw new WsException('Invalid token');
    }
  }
}
