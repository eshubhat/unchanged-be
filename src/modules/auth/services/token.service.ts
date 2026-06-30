import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { JwtPayload, JwtRefreshPayload } from '../interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly BCRYPT_ROUNDS = 10;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Token Generation ───────────────────────────────────────────────────────

  async generateTokenPair(user: User, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    const accessExpiresIn = this.configService.get<number>('JWT_EXPIRES_IN', 900);       // 15m
    const refreshExpiresIn = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800); // 7d

    // Create a DB record first to get a stable UUID for the refresh token payload
    const tokenRecord = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: 'pending',   // will be updated below
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
    await this.refreshTokenRepository.save(tokenRecord);

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      refreshTokenId: tokenRecord.id,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    // Store bcrypt hash — never the raw token
    const tokenHash = await bcrypt.hash(refreshToken, this.BCRYPT_ROUNDS);
    await this.refreshTokenRepository.update(tokenRecord.id, { tokenHash });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessExpiresIn,
      refreshTokenExpiresIn: refreshExpiresIn,
    };
  }

  // ─── Token Rotation ─────────────────────────────────────────────────────────

  /**
   * Validates the stored hash, revokes the old token, and returns the user.
   * Called by JwtRefreshStrategy.validate().
   */
  async validateRefreshToken(tokenId: string, rawToken: string): Promise<User> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { id: tokenId, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token not found or already revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.refreshTokenRepository.update(tokenId, { isRevoked: true });
      throw new UnauthorizedException('Refresh token has expired');
    }

    const isValid = await bcrypt.compare(rawToken, tokenRecord.tokenHash);
    if (!isValid) {
      // Possible token theft — revoke ALL tokens for this user
      await this.revokeAllUserTokens(tokenRecord.userId);
      throw new UnauthorizedException(
        'Invalid refresh token. All sessions have been revoked for security.',
      );
    }

    if (!tokenRecord.user?.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return tokenRecord.user;
  }

  /**
   * Revokes a single refresh token (logout from one device).
   */
  async revokeToken(tokenId: string): Promise<void> {
    const result = await this.refreshTokenRepository.update(
      { id: tokenId, isRevoked: false },
      { isRevoked: true },
    );
    if (result.affected === 0) {
      throw new NotFoundException('Refresh token not found');
    }
  }

  /**
   * Revokes all refresh tokens for a user (logout from all devices).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Housekeeping — purge expired tokens. Call via a scheduled Bull job.
   */
  async purgeExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  // ─── One-Time Tokens (email verify / password reset) ───────────────────────

  /**
   * Generates a short-lived signed JWT used as a one-time email token.
   */
  async generateOneTimeToken(
    userId: string,
    purpose: 'email_verification' | 'password_reset',
    expiresInSeconds = 3600,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, purpose },
      {
        secret: this.configService.getOrThrow<string>('JWT_OTP_SECRET'),
        expiresIn: expiresInSeconds,
      },
    );
  }

  async verifyOneTimeToken(
    token: string,
    expectedPurpose: 'email_verification' | 'password_reset',
  ): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        purpose: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_OTP_SECRET'),
      });

      if (payload.purpose !== expectedPurpose) {
        throw new UnauthorizedException('Invalid token purpose');
      }

      return payload.sub;
    } catch {
      throw new UnauthorizedException('Token is invalid or has expired');
    }
  }
}
