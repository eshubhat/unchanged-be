import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity';

/**
 * Extracts the authenticated user from the request.
 *
 * @example
 * async getProfile(@CurrentUser() user: User) { ... }
 * async getEmail(@CurrentUser('email') email: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    return field ? user?.[field] : user;
  },
);
