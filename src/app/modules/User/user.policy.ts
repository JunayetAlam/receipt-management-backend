import httpStatus from 'http-status';
import { User, UserRoleEnum, UserStatus } from '../../../generated/prisma/client';
import AppError from '../../errors/AppError';
import { AuthUser } from '../../interface';

type Actor = Pick<AuthUser, 'id' | 'role'>;
type Target = Pick<User, 'id' | 'role'>;

export const canManageTarget = (actor: Actor, target: Target) => {
  if (target.role === UserRoleEnum.SUPERADMIN) {
    return false;
  }
  if (actor.role === UserRoleEnum.SUPERADMIN) {
    return true;
  }
  if (actor.role === UserRoleEnum.ADMIN) {
    return target.role === UserRoleEnum.CASHIER;
  }
  return false;
};

export const assertCanManageTarget = (actor: Actor, target: Target) => {
  if (!canManageTarget(actor, target)) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden!');
  }
};

export const assertCanAssignRole = (actor: Actor, role: UserRoleEnum) => {
  if (role === UserRoleEnum.SUPERADMIN) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Superadmin role cannot be assigned',
    );
  }
  if (actor.role === UserRoleEnum.SUPERADMIN) {
    return;
  }
  if (actor.role === UserRoleEnum.ADMIN && role === UserRoleEnum.CASHIER) {
    return;
  }
  throw new AppError(httpStatus.FORBIDDEN, 'Forbidden!');
};

export const accountAccessMessage = (status: UserStatus): string | null => {
  switch (status) {
    case UserStatus.PENDING:
      return 'Your account is pending admin approval.';
    case UserStatus.INACTIVE:
      return 'Your account is inactive.';
    case UserStatus.BLOCKED:
      return 'You are Blocked!';
    default:
      return null;
  }
};
