import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes with JWT access token.
 * Applied globally in AppModule — use @Public() to bypass.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
