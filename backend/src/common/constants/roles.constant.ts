import { UserRole } from '../enums/role.enum';

export const SELF_REGISTER_ROLES = [UserRole.HOUSEHOLD, UserRole.COLLECTOR] as const;

export const ALL_ROLES = Object.values(UserRole);
