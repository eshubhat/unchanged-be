import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { User } from '../entities/user.entity';
import { TokenService, TokenPair } from './token.service';
import { ConfigService } from '@nestjs/config';
import { GoogleProfile } from '../strategies/google.strategy';
import { UserRole } from '../../../common/enums';
import { Address } from '../../address/entities/address.entity';

const BCRYPT_ROUNDS = 12;

export interface AuthResult {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  /** True when the user has no saved shipping address (prompt collection on frontend) */
  hasAddress: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) { }

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    // 1. Check for existing account
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: false,
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 3. Persist user
    const user = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      passwordHash,
      isEmailVerified: false,
      isActive: true,
    });

    await this.userRepository.save(user);

    // 4. If address was provided at registration, save it as default
    if (dto.address) {
      const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ');
      const address = this.addressRepository.create({
        userId: user.id,
        fullName,
        phone: dto.phone ?? '',
        addressLine1: dto.address.addressLine1,
        addressLine2: dto.address.addressLine2 ?? null,
        landmark: dto.address.landmark ?? null,
        city: dto.address.city,
        state: dto.address.state,
        pincode: dto.address.pincode,
        country: dto.address.country ?? 'India',
        isDefault: true,
        label: 'Home',
      });
      await this.addressRepository.save(address);
    }

    // 5. Send verification email (async — non-blocking)
    await this.sendVerificationEmail(user);

    // 6. Issue token pair
    const tokens = await this.tokenService.generateTokenPair(user, ipAddress, userAgent);

    return this.buildAuthResult(user, tokens, !!dto.address);
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    // 1. Fetch user — include passwordHash (normally excluded by select)
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: [
        'id', 'email', 'passwordHash', 'firstName', 'lastName',
        'role', 'isActive', 'isEmailVerified', 'googleId',
      ],
    });

    if (!user) {
      // Constant-time response to prevent user enumeration
      await bcrypt.compare(dto.password, '$2b$12$invalidhashfortimingattack00000000000000000');
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    // 2. Verify password (skip for OAuth accounts without a password)
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account uses Google Sign-In. Please use Google to log in.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Update last login timestamp
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // 4. Issue tokens
    const tokens = await this.tokenService.generateTokenPair(user, ipAddress, userAgent);

    // Check if user has any saved addresses
    const addressCount = await this.addressRepository.count({ where: { userId: user.id } });

    return this.buildAuthResult(user, tokens, addressCount > 0);
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  /**
   * Called after Google OAuth. Finds-or-creates a user, promotes to admin
   * if their email is in ADMIN_EMAILS, and issues a JWT access token.
   */
  async googleLogin(
    profile: GoogleProfile,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const adminEmails = (this.configService.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    console.log("Admin Emails", adminEmails)

    const isAdmin = adminEmails.includes(profile.email.toLowerCase());
    const adminPassword = 'unchangedstudio12';

    // Try to find by googleId first, then by email
    let user = await this.userRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: profile.email },
      });
    }

    if (user) {
      // Existing user — update Google info and role if needed
      const updates: Partial<User> = {
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        lastLoginAt: new Date(),
      };

      if (isAdmin && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
        updates.role = UserRole.ADMIN;
      }

      if (isAdmin) {
        updates.passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
      }

      await this.userRepository.update(user.id, updates);
      // Reload updated user
      user = await this.userRepository.findOne({ where: { id: user.id } }) as User;
    } else {
      // New user — create account
      const newUser = this.userRepository.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        googleId: profile.googleId,
        isEmailVerified: true,
        isActive: true,
        role: isAdmin ? UserRole.ADMIN : UserRole.CUSTOMER,
        passwordHash: isAdmin ? await bcrypt.hash(adminPassword, BCRYPT_ROUNDS) : null,
      });

      user = await this.userRepository.save(newUser);
    }

    const tokens = await this.tokenService.generateTokenPair(user, ipAddress, userAgent);

    // Check if user has any saved addresses
    const addressCount = await this.addressRepository.count({ where: { userId: user.id } });

    return this.buildAuthResult(user, tokens, addressCount > 0);
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(refreshTokenId: string): Promise<void> {
    await this.tokenService.revokeToken(refreshTokenId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }

  // ─── Refresh Tokens ────────────────────────────────────────────────────────

  /**
   * Called after JwtRefreshGuard has already validated the token.
   * Rotates: old token revoked, new pair issued.
   */
  async refresh(
    user: User,
    oldRefreshTokenId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    // Revoke the consumed refresh token (rotation)
    await this.tokenService.revokeToken(oldRefreshTokenId);

    // Issue a fresh pair
    const tokens = await this.tokenService.generateTokenPair(user, ipAddress, userAgent);

    // Check if user has any saved addresses after refresh
    const addressCount = await this.addressRepository.count({ where: { userId: user.id } });

    return this.buildAuthResult(user, tokens, addressCount > 0);
  }

  // ─── Email Verification ────────────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const userId = await this.tokenService.verifyOneTimeToken(
      dto.token,
      'email_verification',
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.userRepository.update(userId, { isEmailVerified: true });
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.sendVerificationEmail(user);
  }

  // ─── Forgot Password ───────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // Always return success to prevent user enumeration attacks
    if (!user || !user.isActive) return;

    const token = await this.tokenService.generateOneTimeToken(
      user.id,
      'password_reset',
      3600, // 1 hour
    );

    // TODO: emit event to NotificationsService
    // this.eventEmitter.emit('auth.password_reset_requested', { user, token });
    this.logResetToken(user.email, token); // dev only
  }

  // ─── Reset Password ────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.tokenService.verifyOneTimeToken(
      dto.token,
      'password_reset',
    );

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.userRepository.update(userId, { passwordHash: newHash });

    // Revoke all existing refresh tokens — force re-login
    await this.tokenService.revokeAllUserTokens(userId);
  }

  // ─── Cookie Helpers ────────────────────────────────────────────────────────

  /**
   * Sets the refresh token as an httpOnly Secure SameSite cookie.
   * Call this from the controller after obtaining tokens.
   */
  setRefreshTokenCookie(res: Response, refreshToken: string, expiresIn: number): void {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: expiresIn * 1000,
      path: '/api/v1/auth',  // restrict cookie scope to auth routes only
    });
  }

  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private buildAuthResult(user: User, tokens: TokenPair, hasAddress = false): AuthResult {
    const { passwordHash, ...safeUser } = user as any;
    return {
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
      hasAddress,
    };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.tokenService.generateOneTimeToken(
      user.id,
      'email_verification',
      86400, // 24 hours
    );

    // TODO: emit event to NotificationsService
    // this.eventEmitter.emit('auth.email_verification_requested', { user, token });
    this.logVerificationToken(user.email, token); // dev only
  }

  /** Dev-only logger — replace with actual email emission */
  private logVerificationToken(email: string, token: string): void {
    if (this.configService.get('NODE_ENV') !== 'production') {
      console.log(`[DEV] Email verification token for ${email}: ${token}`);
    }
  }

  private logResetToken(email: string, token: string): void {
    if (this.configService.get('NODE_ENV') !== 'production') {
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }
  }
}
