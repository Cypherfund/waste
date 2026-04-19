import { CanActivate, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from '../common/decorators/current-user.decorator';

/**
 * Guard for WebSocket connections.
 * Extracts JWT from handshake auth.token or query.token,
 * validates user, and attaches user context to socket.data.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: any): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    return this.authenticateSocket(client);
  }

  /**
   * Authenticate a socket connection during handshake.
   * Called from gateway handleConnection.
   */
  async authenticateSocket(client: Socket): Promise<boolean> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.debug('WS auth failed: no token');
        return false;
      }

      const payload: JwtPayload = this.jwtService.verify(token);

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        select: ['id', 'role', 'isActive'],
      });

      if (!user || !user.isActive) {
        this.logger.debug(`WS auth failed: user ${payload.sub} not found or inactive`);
        return false;
      }

      // Attach user context to socket
      client.data.user = { sub: user.id, role: user.role };
      return true;
    } catch (err) {
      this.logger.debug(`WS auth failed: ${err.message}`);
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    // Try auth.token first (preferred), then query param
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    const queryToken = client.handshake?.query?.token;
    if (typeof queryToken === 'string') return queryToken;

    return null;
  }
}
