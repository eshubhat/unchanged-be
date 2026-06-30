import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../common/enums';

export const ROLES_KEY = 'roles';

/**
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * Attach required roles to a route or controller class.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
