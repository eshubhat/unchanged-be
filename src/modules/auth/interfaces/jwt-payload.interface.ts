export interface JwtPayload {
  sub: string;       // user UUID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshTokenId: string;  // stored token UUID for rotation
}
