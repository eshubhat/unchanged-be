import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Used exclusively on the /auth/refresh endpoint.
 * Validates the refresh token via the jwt-refresh Passport strategy.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
