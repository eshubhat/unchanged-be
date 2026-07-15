import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Triggers the Google OAuth redirect flow.
 * Used on GET /auth/google and GET /auth/google/callback.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
