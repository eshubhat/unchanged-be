import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as publicly accessible — bypasses the global JwtAuthGuard.
 *
 * @example
 * @Public()
 * @Get('products')
 * listProducts() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
