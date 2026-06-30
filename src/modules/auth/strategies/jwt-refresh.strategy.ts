import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import { TokenService } from '../services/token.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Prefer httpOnly cookie for refresh tokens (more secure)
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
        // Fallback: request body (used by mobile clients)
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Validates the refresh token AND ensures the stored hash matches.
   * This enables token rotation and immediate revocation.
   */
  async validate(req: Request, payload: JwtRefreshPayload) {
    const rawToken =
      req.cookies?.['refresh_token'] ?? req.body?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.tokenService.validateRefreshToken(
      payload.refreshTokenId,
      rawToken,
    );

    return { ...user, refreshTokenId: payload.refreshTokenId };
  }
}
