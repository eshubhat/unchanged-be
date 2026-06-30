import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './services/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 req/min per IP
  @ApiOperation({ summary: 'Create a new customer account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.register(dto, ip, userAgent);

    this.authService.setRefreshTokenCookie(
      res,
      result.refreshToken,
      result.accessTokenExpiresIn,
    );

    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.accessTokenExpiresIn,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min per IP
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);

    this.authService.setRefreshTokenCookie(
      res,
      result.refreshToken,
      result.accessTokenExpiresIn,
    );

    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.accessTokenExpiresIn,
    };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from current device (revoke refresh token)' })
  @ApiCookieAuth('refresh_token')
  async logout(
    @CurrentUser() user: User & { refreshTokenId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.refreshTokenId);
    this.authService.clearRefreshTokenCookie(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices (revoke all refresh tokens)' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);
    this.authService.clearRefreshTokenCookie(res);
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refresh(
    @CurrentUser() user: User & { refreshTokenId: string },
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.refresh(
      user,
      user.refreshTokenId,
      ip,
      userAgent,
    );

    this.authService.setRefreshTokenCookie(
      res,
      result.refreshToken,
      result.accessTokenExpiresIn,
    );

    return {
      accessToken: result.accessToken,
      expiresIn: result.accessTokenExpiresIn,
    };
  }

  // ─── Email Verification ───────────────────────────────────────────────────

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token from email link' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto);
    return { message: 'Email verified successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 req/min
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@CurrentUser('id') userId: string) {
    await this.authService.resendVerificationEmail(userId);
    return { message: 'Verification email sent' };
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 req/5min per IP
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    // Always return same response — never leak whether email exists
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password has been reset successfully. Please log in.' };
  }

  // ─── Profile (quick auth check) ───────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: User) {
    return { user };
  }
}
