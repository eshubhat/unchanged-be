import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  /**
   * Called after Google verifies the OAuth code.
   * The returned value is set on request.user.
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const email: string = profile.emails?.[0]?.value ?? '';
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName ?? profile.displayName ?? 'User',
      lastName: profile.name?.familyName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };

    done(null, googleProfile);
  }
}
